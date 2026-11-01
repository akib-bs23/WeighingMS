import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * WeighingMS's composed weighing ticket plus its current print status, one row per session.
 * Mirrors `write_backs` (bolt 003) exactly: the ticket content is immutable once composed; the
 * status/attempts/lastError columns track printing, which is retried in place while `PENDING`.
 */
export const tickets = sqliteTable('tickets', {
  sessionId: text('session_id').primaryKey(),
  ticketId: text('ticket_id').notNull(),
  batchId: text('batch_id').notNull(),
  orderRef: text('order_ref').notNull(),
  machineRef: text('machine_ref').notNull(),
  shadeCode: text('shade_code').notNull(),
  date: text('date').notNull(),
  operatorName: text('operator_name').notNull(),
  linesJson: text('lines_json').notNull(),
  toleranceSummary: text('tolerance_summary').notNull(),
  barcodeValue: text('barcode_value').notNull(),
  status: text('status', { enum: ['PENDING', 'PRINTED'] }).notNull(),
  jobId: text('job_id'),
  printedAt: text('printed_at'),
  isReprint: integer('is_reprint', { mode: 'boolean' }).notNull(),
  attempts: integer('attempts').notNull(),
  lastError: text('last_error'),
  updatedAt: text('updated_at').notNull(),
});
