import { Inject, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import type { AuditEventView } from '../../shared/contracts/weighing';
import { DATABASE, type Db } from '../database/database.provider';
import { auditEvents } from '../database/schema';

/**
 * Time-ordered, append-only audit trail (story 013 AC2). No update or delete method exists —
 * same immutability guarantee as `WeighingRecordRepository` (NFR-9).
 */
@Injectable()
export class AuditEventRepository {
  constructor(@Inject(DATABASE) private readonly db: Db) {}

  add(event: AuditEventView): void {
    this.db.insert(auditEvents).values(event).run();
  }

  listBySession(sessionId: string): AuditEventView[] {
    return this.db
      .select()
      .from(auditEvents)
      .where(eq(auditEvents.sessionId, sessionId))
      .orderBy(asc(auditEvents.occurredAt))
      .all();
  }
}
