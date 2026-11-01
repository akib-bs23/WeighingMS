import { Inject, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import type { OverrideView, WeighingRecordView } from '../../shared/contracts/weighing';
import { DATABASE, type Db } from '../database/database.provider';
import { overrides, weighingRecords } from '../database/schema';

/**
 * Confirmed weighings. Deliberately exposes only `add` and read methods — there is no update or
 * delete method anywhere in this class, which is how immutability (NFR-9, brief DR-02) is
 * actually enforced: a correction can only ever be a new record.
 *
 * `add` never receives the `override` field directly — an `OVERRIDDEN` record's override detail
 * is written separately (`OverrideRepository.add`, same transaction, Invariant 6) and only
 * joined back in on read, so this repository's own insert never has to special-case the two
 * result kinds.
 */
@Injectable()
export class WeighingRecordRepository {
  constructor(@Inject(DATABASE) private readonly db: Db) {}

  add(record: Omit<WeighingRecordView, 'override'>): void {
    this.db.insert(weighingRecords).values(record).run();
  }

  listBySession(sessionId: string): WeighingRecordView[] {
    const rows = this.db
      .select()
      .from(weighingRecords)
      .leftJoin(overrides, eq(overrides.recordId, weighingRecords.recordId))
      .where(eq(weighingRecords.sessionId, sessionId))
      .orderBy(asc(weighingRecords.confirmedAt))
      .all();
    return rows.map(({ weighing_records, overrides: override }) => ({
      ...weighing_records,
      override: override ? toOverrideView(override) : null,
    }));
  }
}

function toOverrideView(row: typeof overrides.$inferSelect): OverrideView {
  return { supervisorId: row.supervisorId, reason: row.reason, authorisedAt: row.authorisedAt };
}
