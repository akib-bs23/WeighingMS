import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import type { ComponentView, SessionView } from '../../shared/contracts/weighing';
import { selectScaleClass } from '../../shared/weighing/scale-selection';
import { NotFoundError } from '../common/errors/domain-error';
import { DATABASE, type Db } from '../database/database.provider';
import {
  auditEvents,
  overrides,
  sessionComponents,
  weighingRecords,
  weighingSessions,
} from '../database/schema';
import { ResetRegistry } from '../training/reset.registry';

type SessionRow = typeof weighingSessions.$inferSelect;
type ComponentRow = typeof sessionComponents.$inferSelect;

/**
 * Persists a WeighingSession aggregate (session + its components) as a unit. Saves write the
 * whole aggregate on every state change (NFR-7: durable before acknowledging to the caller).
 */
@Injectable()
export class WeighingSessionRepository implements OnModuleInit {
  constructor(
    @Inject(DATABASE) private readonly db: Db,
    private readonly registry: ResetRegistry,
  ) {}

  onModuleInit(): void {
    // No seed data of its own (sessions start empty) — always "seeded"; reset clears everything
    // a training scenario accumulates for the weighing domain, including confirmed records.
    this.registry.register({
      name: 'weighing-sessions',
      isSeeded: () => true,
      reset: () => {
        this.db.transaction((tx) => {
          tx.delete(overrides).run();
          tx.delete(auditEvents).run();
          tx.delete(weighingRecords).run();
          tx.delete(sessionComponents).run();
          tx.delete(weighingSessions).run();
        });
      },
    });
  }

  /** The station's single open session, if any (AS-6: at most one per station). */
  findOpenAtStation(stationId: string): SessionView | null {
    const row = this.db
      .select()
      .from(weighingSessions)
      .where(
        and(eq(weighingSessions.stationId, stationId), eq(weighingSessions.status, 'IN_PROGRESS')),
      )
      .get();
    return row ? this.hydrate(row) : null;
  }

  findById(sessionId: string): SessionView {
    const row = this.db
      .select()
      .from(weighingSessions)
      .where(eq(weighingSessions.sessionId, sessionId))
      .get();
    if (!row) {
      throw new NotFoundError('SESSION_NOT_FOUND', `No weighing session ${sessionId}`, {
        sessionId,
      });
    }
    return this.hydrate(row);
  }

  /** Replaces the session row and all of its component rows in one transaction. */
  save(session: SessionView): void {
    this.db.transaction((tx) => {
      tx.insert(weighingSessions)
        .values({
          sessionId: session.sessionId,
          batchId: session.batchId,
          orderRef: session.orderRef,
          machineRef: session.machineRef,
          shadeCode: session.shadeCode,
          stationId: session.stationId,
          operatorId: session.operatorId,
          status: session.status,
          activeComponentId: session.activeComponentId,
          startedAt: session.startedAt,
          completedAt: session.completedAt,
        })
        .onConflictDoUpdate({
          target: weighingSessions.sessionId,
          set: {
            status: session.status,
            activeComponentId: session.activeComponentId,
            completedAt: session.completedAt,
          },
        })
        .run();
      tx.delete(sessionComponents).where(eq(sessionComponents.sessionId, session.sessionId)).run();
      tx.insert(sessionComponents)
        .values(session.components.map((c) => toComponentRow(session.sessionId, c)))
        .run();
    });
  }

  private hydrate(row: SessionRow): SessionView {
    const rows = this.db
      .select()
      .from(sessionComponents)
      .where(eq(sessionComponents.sessionId, row.sessionId))
      .all();
    return {
      sessionId: row.sessionId,
      batchId: row.batchId,
      orderRef: row.orderRef,
      machineRef: row.machineRef,
      shadeCode: row.shadeCode,
      stationId: row.stationId,
      operatorId: row.operatorId,
      status: row.status,
      activeComponentId: row.activeComponentId,
      startedAt: row.startedAt,
      completedAt: row.completedAt,
      components: rows.sort((a, b) => a.sequence - b.sequence).map(toComponentView),
    };
  }
}

function toComponentRow(
  sessionId: string,
  c: ComponentView,
): typeof sessionComponents.$inferInsert {
  return {
    sessionId,
    componentId: c.componentId,
    sequence: c.sequence,
    state: c.state,
    dyestuffCode: c.dyestuff.code,
    dyestuffName: c.dyestuff.name,
    dyestuffType: c.dyestuff.type,
    colourHex: c.dyestuff.colourHex,
    barcode: c.dyestuff.barcode,
    lotId: c.lotId,
    containerId: c.containerId,
    targetMg: c.targetMg,
    uom: c.uom,
    toleranceMg: c.toleranceMg,
    displayMaxMg: c.displayMaxMg,
    scaleId: c.scaleId,
    tareMg: c.tareMg,
    identity: c.identity,
    identityMismatchDetail: c.identityMismatchDetail,
  };
}

function toComponentView(row: ComponentRow): ComponentView {
  return {
    componentId: row.componentId,
    sequence: row.sequence,
    state: row.state,
    dyestuff: {
      code: row.dyestuffCode,
      name: row.dyestuffName,
      type: row.dyestuffType,
      colourHex: row.colourHex,
      barcode: row.barcode,
    },
    lotId: row.lotId,
    containerId: row.containerId,
    scaleId: row.scaleId,
    scaleClass: selectScaleClass(row.targetMg),
    uom: row.uom,
    targetMg: row.targetMg,
    toleranceMg: row.toleranceMg,
    displayMaxMg: row.displayMaxMg,
    tareMg: row.tareMg,
    identity: row.identity,
    identityMismatchDetail: row.identityMismatchDetail,
  };
}
