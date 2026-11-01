import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * WeighingMS record of posting a session's consumption to OrgaTEX. The request is stored so a
 * retry re-sends exactly the same payload under the same idempotency key (the session id).
 */
export const writeBacks = sqliteTable('write_backs', {
  sessionId: text('session_id').primaryKey(),
  batchId: text('batch_id').notNull(),
  status: text('status', { enum: ['PENDING', 'CONFIRMED'] }).notNull(),
  requestJson: text('request_json').notNull(),
  consumptionId: text('consumption_id'),
  confirmedAt: text('confirmed_at'),
  attempts: integer('attempts').notNull(),
  lastError: text('last_error'),
  updatedAt: text('updated_at').notNull(),
});
