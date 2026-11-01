import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { ConsumptionRequest } from '../../../../shared/contracts/orgatex';
import type { WriteBackState } from '../../../../shared/contracts/write-back';
import { CLOCK, type Clock } from '../../../common/clock/clock';
import { DomainError, NotFoundError } from '../../../common/errors/domain-error';
import { DATABASE, type Db } from '../../../database/database.provider';
import { writeBacks } from '../../../database/schema';
import { ResetRegistry } from '../../../training/reset.registry';
import { ORGATEX_PORT, type OrgatexPort } from '../orgatex.port';

type WriteBackRow = typeof writeBacks.$inferSelect;

/**
 * Posts a completed session's actual consumption to OrgaTEX (FR-24). If OrgaTEX is unavailable
 * the batch stays completed locally with status PENDING and can be retried by hand (TD-8). The
 * stored request is re-sent unchanged under the session id as idempotency key, so a retry after
 * an ambiguous failure can never double-post (IR-08).
 */
@Injectable()
export class WriteBackService implements OnModuleInit {
  private readonly logger = new Logger(WriteBackService.name);

  constructor(
    @Inject(DATABASE) private readonly db: Db,
    @Inject(ORGATEX_PORT) private readonly orgatex: OrgatexPort,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly registry: ResetRegistry,
  ) {}

  onModuleInit(): void {
    this.registry.register({
      name: 'write-back',
      isSeeded: () => true,
      reset: () => {
        this.db.delete(writeBacks).run();
      },
    });
  }

  /** Records and attempts the posting for a completed session; repeated calls are safe. */
  async submit(
    sessionId: string,
    batchId: string,
    request: ConsumptionRequest,
  ): Promise<WriteBackState> {
    const existing = this.find(sessionId);
    if (existing) return this.retry(sessionId);
    this.db
      .insert(writeBacks)
      .values({
        sessionId,
        batchId,
        status: 'PENDING',
        requestJson: JSON.stringify(request),
        attempts: 0,
        updatedAt: this.nowIso(),
      })
      .run();
    return this.attempt(this.load(sessionId));
  }

  /** Re-posts a PENDING write-back; a CONFIRMED one is returned without contacting OrgaTEX. */
  async retry(sessionId: string): Promise<WriteBackState> {
    const row = this.load(sessionId);
    if (row.status === 'CONFIRMED') return toState(row);
    return this.attempt(row);
  }

  get(sessionId: string): WriteBackState {
    return toState(this.load(sessionId));
  }

  private async attempt(row: WriteBackRow): Promise<WriteBackState> {
    const request = JSON.parse(row.requestJson) as ConsumptionRequest;
    const attempts = row.attempts + 1;
    try {
      const receipt = await this.orgatex.postConsumption(row.batchId, row.sessionId, request);
      this.update(row.sessionId, {
        status: 'CONFIRMED',
        consumptionId: receipt.consumptionId,
        confirmedAt: receipt.confirmedAt,
        attempts,
        lastError: null,
      });
      this.logger.log(
        `Consumption for batch ${row.batchId} confirmed by OrgaTEX (session ${row.sessionId})`,
      );
    } catch (e) {
      const code = e instanceof DomainError ? e.code : 'INTERNAL_ERROR';
      this.update(row.sessionId, { status: 'PENDING', attempts, lastError: code });
      if (code === 'ORGATEX_UNAVAILABLE') {
        this.logger.warn(`Write-back for batch ${row.batchId} pending: OrgaTEX unavailable`);
      } else {
        // A rejection is a data problem, not an outage: keep PENDING for manual attention.
        this.logger.error(
          `Write-back for batch ${row.batchId} rejected: ${code}`,
          e instanceof Error ? e.stack : undefined,
        );
      }
    }
    return toState(this.load(row.sessionId));
  }

  private update(sessionId: string, values: Partial<WriteBackRow>): void {
    this.db
      .update(writeBacks)
      .set({ ...values, updatedAt: this.nowIso() })
      .where(eq(writeBacks.sessionId, sessionId))
      .run();
  }

  private find(sessionId: string): WriteBackRow | undefined {
    return this.db.select().from(writeBacks).where(eq(writeBacks.sessionId, sessionId)).get();
  }

  private load(sessionId: string): WriteBackRow {
    const row = this.find(sessionId);
    if (!row) {
      throw new NotFoundError(
        'WRITE_BACK_NOT_FOUND',
        `No OrgaTEX write-back for session ${sessionId}`,
        { sessionId },
      );
    }
    return row;
  }

  private nowIso(): string {
    return new Date(this.clock.now()).toISOString();
  }
}

function toState(row: WriteBackRow): WriteBackState {
  return {
    sessionId: row.sessionId,
    batchId: row.batchId,
    status: row.status,
    consumptionId: row.consumptionId,
    confirmedAt: row.confirmedAt,
    attempts: row.attempts,
    lastError: row.lastError,
  };
}
