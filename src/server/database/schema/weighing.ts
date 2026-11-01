import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { DYESTUFF_TYPES, WEIGHING_RESULTS } from '../../../shared/contracts/orgatex';

const IDENTITY_STATUSES = ['UNVERIFIED', 'VERIFIED', 'MISMATCH'] as const;
const AUDIT_EVENT_TYPES = ['OVERRIDE', 'ABANDON', 'REPRINT'] as const;

/*
 * WeighingMS-owned tables for the core weighing domain (unit 004). Quantities are integer
 * milligrams throughout, matching every other table in this schema.
 */

export const weighingSessions = sqliteTable('weighing_sessions', {
  sessionId: text('session_id').primaryKey(),
  batchId: text('batch_id').notNull(),
  orderRef: text('order_ref').notNull().default(''),
  machineRef: text('machine_ref').notNull().default(''),
  shadeCode: text('shade_code').notNull().default(''),
  stationId: text('station_id').notNull(),
  operatorId: text('operator_id').notNull(),
  status: text('status', { enum: ['IN_PROGRESS', 'COMPLETED'] }).notNull(),
  activeComponentId: text('active_component_id'),
  startedAt: text('started_at').notNull(),
  completedAt: text('completed_at'),
});

/** One row per recipe component, snapshotted at session start — never re-read from OrgaTEX. */
export const sessionComponents = sqliteTable(
  'session_components',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sessionId: text('session_id')
      .notNull()
      .references(() => weighingSessions.sessionId),
    componentId: text('component_id').notNull(),
    sequence: integer('sequence').notNull(),
    state: text('state', { enum: ['PENDING', 'ACTIVE', 'DONE'] }).notNull(),
    dyestuffCode: text('dyestuff_code').notNull(),
    dyestuffName: text('dyestuff_name').notNull(),
    dyestuffType: text('dyestuff_type', { enum: DYESTUFF_TYPES }).notNull(),
    colourHex: text('colour_hex').notNull(),
    barcode: text('barcode').notNull(),
    lotId: text('lot_id').notNull(),
    containerId: text('container_id').notNull(),
    targetMg: integer('target_mg').notNull(),
    uom: text('uom', { enum: ['g', 'kg'] }).notNull(),
    toleranceMg: integer('tolerance_mg').notNull(),
    displayMaxMg: integer('display_max_mg').notNull(),
    scaleId: text('scale_id'),
    tareMg: integer('tare_mg'),
    identity: text('identity', { enum: IDENTITY_STATUSES }).notNull().default('UNVERIFIED'),
    identityMismatchDetail: text('identity_mismatch_detail'),
  },
  (t) => [uniqueIndex('session_components_session_component_idx').on(t.sessionId, t.componentId)],
);

/**
 * Confirmed weighings. Immutable by construction: this table has no update or delete path
 * anywhere in the codebase (NFR-9) — the repository exposes only `add` and read methods.
 */
export const weighingRecords = sqliteTable('weighing_records', {
  recordId: text('record_id').primaryKey(),
  sessionId: text('session_id')
    .notNull()
    .references(() => weighingSessions.sessionId),
  componentId: text('component_id').notNull(),
  lotId: text('lot_id').notNull(),
  containerId: text('container_id').notNull(),
  tareMg: integer('tare_mg').notNull(),
  scaleId: text('scale_id').notNull(),
  targetMg: integer('target_mg').notNull(),
  toleranceMinMg: integer('tolerance_min_mg').notNull(),
  toleranceMaxMg: integer('tolerance_max_mg').notNull(),
  actualMg: integer('actual_mg').notNull(),
  uom: text('uom', { enum: ['g', 'kg'] }).notNull(),
  result: text('result', { enum: WEIGHING_RESULTS }).notNull(),
  operatorId: text('operator_id').notNull(),
  confirmedAt: text('confirmed_at').notNull(),
});

/**
 * Supervisor authorisation detail for an `OVERRIDDEN` `weighing_records` row. Immutable, created
 * atomically with the record it authorises (Invariant 6) — no update or delete path exists.
 */
export const overrides = sqliteTable('overrides', {
  overrideId: text('override_id').primaryKey(),
  recordId: text('record_id')
    .notNull()
    .references(() => weighingRecords.recordId),
  supervisorId: text('supervisor_id').notNull(),
  reason: text('reason').notNull(),
  authorisedAt: text('authorised_at').notNull(),
});

/**
 * Time-ordered, append-only log of privileged/exceptional actions against a session (story 013
 * AC2). No update or delete path exists.
 */
export const auditEvents = sqliteTable('audit_events', {
  eventId: text('event_id').primaryKey(),
  sessionId: text('session_id')
    .notNull()
    .references(() => weighingSessions.sessionId),
  type: text('type', { enum: AUDIT_EVENT_TYPES }).notNull(),
  actorId: text('actor_id').notNull(),
  detail: text('detail').notNull(),
  occurredAt: text('occurred_at').notNull(),
});
