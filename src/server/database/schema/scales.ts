import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/** Scale configuration (WeighingMS-owned master data, seeded for training). */
export const scales = sqliteTable('scales', {
  scaleId: text('scale_id').primaryKey(),
  class: text('class', { enum: ['PRECISION', 'FLOOR'] }).notNull(),
  name: text('name').notNull(),
  uom: text('uom', { enum: ['g', 'kg'] }).notNull(),
  capacityMg: integer('capacity_mg').notNull(),
  resolutionMg: integer('resolution_mg').notNull(),
});
