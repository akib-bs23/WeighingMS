import { randomUUID } from 'node:crypto';
import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { SessionView } from '../../shared/contracts/weighing';
import type { TicketLineView, TicketState, TicketView } from '../../shared/contracts/ticket';
import { CLOCK, type Clock } from '../common/clock/clock';
import { DomainError, NotFoundError } from '../common/errors/domain-error';
import { DATABASE, type Db } from '../database/database.provider';
import { tickets } from '../database/schema';
import { PRINTER_PORT, type PrinterPort } from '../integrations/printer/printer.port';
import { ResetRegistry } from '../training/reset.registry';
import { AuditEventRepository } from '../weighing/audit-event.repository';
import { WeighingRecordRepository } from '../weighing/weighing-record.repository';
import { WeighingSessionService } from '../weighing/weighing-session.service';

type TicketRow = typeof tickets.$inferSelect;

/**
 * Composes a session's weighing ticket exactly once and manages its print status, mirroring
 * `WriteBackService` (bolt 003) deliberately: one row per session, retried in place while
 * `PENDING`, with a separate explicit `reprint` action once `PRINTED` (story 003).
 */
@Injectable()
export class TicketService implements OnModuleInit {
  constructor(
    @Inject(DATABASE) private readonly db: Db,
    @Inject(PRINTER_PORT) private readonly printer: PrinterPort,
    private readonly sessions: WeighingSessionService,
    private readonly records: WeighingRecordRepository,
    private readonly audit: AuditEventRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly registry: ResetRegistry,
  ) {}

  onModuleInit(): void {
    this.registry.register({
      name: 'tickets',
      isSeeded: () => true,
      reset: () => {
        this.db.delete(tickets).run();
      },
    });
  }

  /** Composes the ticket if none exists yet, then attempts to print; repeated calls are safe. */
  async submit(sessionId: string): Promise<TicketState> {
    const existing = this.find(sessionId);
    if (existing) return this.retry(sessionId);

    const session = this.sessions.get(sessionId);
    if (session.status !== 'COMPLETED') {
      throw new DomainError('BATCH_INCOMPLETE', 'The batch has not been completed yet', 409, {
        sessionId,
      });
    }
    const summary = this.sessions.getSummary(sessionId);
    const ticket = this.compose(session, summary.operatorName, summary.allWithinTolerance);

    this.db
      .insert(tickets)
      .values({
        sessionId,
        ticketId: ticket.ticketId,
        batchId: ticket.batchId,
        orderRef: ticket.orderRef,
        machineRef: ticket.machineRef,
        shadeCode: ticket.shadeCode,
        date: ticket.date,
        operatorName: ticket.operatorName,
        linesJson: JSON.stringify(ticket.lines),
        toleranceSummary: ticket.toleranceSummary,
        barcodeValue: ticket.barcodeValue,
        status: 'PENDING',
        isReprint: false,
        attempts: 0,
        updatedAt: this.nowIso(),
      })
      .run();
    return this.attempt(this.load(sessionId), false);
  }

  /** Re-attempts a PENDING ticket; a PRINTED one is returned without reprinting. */
  async retry(sessionId: string): Promise<TicketState> {
    const row = this.load(sessionId);
    if (row.status === 'PRINTED') return toState(row);
    return this.attempt(row, false);
  }

  /**
   * Prints an already-printed ticket again, marked `REPRINT` (story 003) — only valid once the
   * first print has actually succeeded; a still-`PENDING` ticket should be retried, not reprinted.
   */
  async reprint(sessionId: string): Promise<TicketState> {
    const row = this.load(sessionId);
    if (row.status !== 'PRINTED') {
      throw new DomainError(
        'TICKET_NOT_PRINTED',
        'The ticket has not been printed yet — retry it instead of reprinting',
        409,
        { sessionId },
      );
    }
    const actorId = this.sessions.get(sessionId).operatorId;
    return this.attempt(row, true, actorId);
  }

  get(sessionId: string): TicketState {
    return toState(this.load(sessionId));
  }

  private async attempt(
    row: TicketRow,
    isReprint: boolean,
    actorId?: string,
  ): Promise<TicketState> {
    const attempts = row.attempts + 1;
    try {
      const lines = JSON.parse(row.linesJson) as string[];
      const job = await this.printer.print({
        ticketId: row.ticketId,
        lines,
        barcodeValue: row.barcodeValue,
      });
      this.update(row.sessionId, {
        status: 'PRINTED',
        jobId: job.jobId,
        printedAt: this.nowIso(),
        isReprint,
        attempts,
        lastError: null,
      });
      if (isReprint) {
        this.audit.add({
          eventId: randomUUID(),
          sessionId: row.sessionId,
          type: 'REPRINT',
          actorId: actorId ?? row.operatorName,
          detail: `Reprint: ticket ${row.ticketId} for batch ${row.batchId}`,
          occurredAt: this.nowIso(),
        });
      }
    } catch (e) {
      const code = e instanceof DomainError ? e.code : 'INTERNAL_ERROR';
      this.update(row.sessionId, { status: 'PENDING', attempts, lastError: code });
    }
    return toState(this.load(row.sessionId));
  }

  private update(sessionId: string, values: Partial<TicketRow>): void {
    this.db
      .update(tickets)
      .set({ ...values, updatedAt: this.nowIso() })
      .where(eq(tickets.sessionId, sessionId))
      .run();
  }

  private compose(
    session: SessionView,
    operatorName: string,
    allWithinTolerance: boolean,
  ): TicketView {
    const records = this.records.listBySession(session.sessionId);
    // Recipe sequence order (session.components is always sorted by sequence), not confirmation
    // order — the ticket reads like the recipe regardless of which order the operator weighed in
    // (story 011's "jumped ahead" case must not reorder the printed record).
    const lines: TicketLineView[] = session.components.map((c) => {
      const record = records.find((r) => r.componentId === c.componentId);
      if (!record) {
        // Unreachable: submit() only composes once every component is DONE, and a component only
        // ever becomes DONE together with its WeighingRecord (Invariant 3, bolt 006).
        throw new DomainError(
          'INTERNAL_ERROR',
          `Completed component ${c.componentId} has no weighing record`,
          500,
        );
      }
      return { name: c.dyestuff.name, targetMg: c.targetMg, actualMg: record.actualMg, uom: c.uom };
    });
    return {
      ticketId: randomUUID(),
      sessionId: session.sessionId,
      batchId: session.batchId,
      orderRef: session.orderRef,
      machineRef: session.machineRef,
      shadeCode: session.shadeCode,
      date: formatTicketDate(session.completedAt ?? this.nowIso()),
      operatorName,
      lines,
      toleranceSummary: allWithinTolerance ? 'ALL WITHIN TOLERANCE' : 'OVERRIDDEN — SEE RECORDS',
      barcodeValue: session.batchId,
    };
  }

  private find(sessionId: string): TicketRow | undefined {
    return this.db.select().from(tickets).where(eq(tickets.sessionId, sessionId)).get();
  }

  private load(sessionId: string): TicketRow {
    const row = this.find(sessionId);
    if (!row) {
      throw new NotFoundError('TICKET_NOT_FOUND', `No ticket for session ${sessionId}`, {
        sessionId,
      });
    }
    return row;
  }

  private nowIso(): string {
    return new Date(this.clock.now()).toISOString();
  }
}

function toState(row: TicketRow): TicketState {
  return {
    ticket: {
      ticketId: row.ticketId,
      sessionId: row.sessionId,
      batchId: row.batchId,
      orderRef: row.orderRef,
      machineRef: row.machineRef,
      shadeCode: row.shadeCode,
      date: row.date,
      operatorName: row.operatorName,
      lines: JSON.parse(row.linesJson) as TicketLineView[],
      toleranceSummary: row.toleranceSummary,
      barcodeValue: row.barcodeValue,
    },
    status: row.status,
    jobId: row.jobId,
    printedAt: row.printedAt,
    isReprint: row.isReprint,
    attempts: row.attempts,
    lastError: row.lastError,
  };
}

/** `YYYY-MM-DD HH:MM` (story 002 AC1) from an ISO instant. */
function formatTicketDate(iso: string): string {
  return iso.slice(0, 16).replace('T', ' ');
}
