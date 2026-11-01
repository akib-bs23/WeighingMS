import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import {
  BATCH_STATUSES,
  DYESTUFF_TYPES,
  WEIGHING_RESULTS,
} from '../../../shared/contracts/orgatex';

/*
 * Dummy OrgaTEX tables (training substitute). WeighingMS code never queries these directly;
 * it goes through OrgatexPort. Quantities are integer milligrams.
 */

export const orgatexDyestuffs = sqliteTable('orgatex_dyestuffs', {
  code: text('code').primaryKey(),
  name: text('name').notNull(),
  type: text('type', { enum: DYESTUFF_TYPES }).notNull(),
  colourHex: text('colour_hex').notNull(),
  barcode: text('barcode').notNull(),
});

export const orgatexBatches = sqliteTable('orgatex_batches', {
  batchId: text('batch_id').primaryKey(),
  orderRef: text('order_ref').notNull(),
  machineRef: text('machine_ref').notNull(),
  fabricDesc: text('fabric_desc').notNull(),
  fabricWeightKg: integer('fabric_weight_kg').notNull(),
  shadeCode: text('shade_code').notNull(),
  componentCount: integer('component_count').notNull(),
  status: text('status', { enum: BATCH_STATUSES }).notNull(),
  // Not a foreign key: queued batches may reference recipes OrgaTEX has not issued yet.
  recipeId: text('recipe_id').notNull(),
});

export const orgatexRecipes = sqliteTable('orgatex_recipes', {
  recipeId: text('recipe_id').primaryKey(),
  shadeCode: text('shade_code').notNull(),
});

export const orgatexRecipeComponents = sqliteTable('orgatex_recipe_components', {
  componentId: text('component_id').primaryKey(),
  recipeId: text('recipe_id')
    .notNull()
    .references(() => orgatexRecipes.recipeId),
  sequence: integer('sequence').notNull(),
  dyestuffCode: text('dyestuff_code')
    .notNull()
    .references(() => orgatexDyestuffs.code),
  uom: text('uom', { enum: ['g', 'kg'] }).notNull(),
  targetMg: integer('target_mg').notNull(),
  toleranceMg: integer('tolerance_mg').notNull(),
  displayMaxMg: integer('display_max_mg').notNull(),
  lotId: text('lot_id').notNull(),
  containerId: text('container_id').notNull(),
});

/** Consumption received by the Dummy OrgaTEX. One per batch; idempotency key is unique. */
export const orgatexConsumptions = sqliteTable('orgatex_consumptions', {
  consumptionId: text('consumption_id').primaryKey(),
  batchId: text('batch_id').notNull().unique(),
  idempotencyKey: text('idempotency_key').notNull().unique(),
  payloadHash: text('payload_hash').notNull(),
  stationId: text('station_id').notNull(),
  operatorId: text('operator_id').notNull(),
  completedAt: text('completed_at').notNull(),
  confirmedAt: text('confirmed_at').notNull(),
});

export const orgatexConsumptionLines = sqliteTable('orgatex_consumption_lines', {
  lineId: integer('line_id').primaryKey({ autoIncrement: true }),
  consumptionId: text('consumption_id')
    .notNull()
    .references(() => orgatexConsumptions.consumptionId),
  componentId: text('component_id').notNull(),
  dyestuffCode: text('dyestuff_code').notNull(),
  lotId: text('lot_id').notNull(),
  targetMg: integer('target_mg').notNull(),
  actualMg: integer('actual_mg').notNull(),
  uom: text('uom', { enum: ['g', 'kg'] }).notNull(),
  scaleId: text('scale_id').notNull(),
  result: text('result', { enum: WEIGHING_RESULTS }).notNull(),
});
