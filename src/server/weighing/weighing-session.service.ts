import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { BatchSelectionService } from '../batches/batch-selection.service';
import { CLOCK, type Clock } from '../common/clock/clock';
import { DomainError, NotFoundError } from '../common/errors/domain-error';
import { verifyPin } from '../common/security/scrypt-pin';
import { WriteBackService } from '../integrations/orgatex/write-back/write-back.service';
import { SCALE_PORT, type ScalePort } from '../integrations/scale/scale.port';
import { SeedService } from '../training/seed/seed.service';
import type {
  AuditEventView,
  BatchSummaryView,
  ComponentView,
  CompletionResult,
  ConfirmResult,
  SessionView,
  WeighingRecordView,
} from '../../shared/contracts/weighing';
import type { ConsumptionLine } from '../../shared/contracts/orgatex';
import { formatWithUnit } from '../../shared/quantity/format-quantity';
import { classifyScan } from '../../shared/batches/scan-code';
import { nextActive } from '../../shared/weighing/progression';
import { classifyReading } from '../../shared/weighing/reading-safety';
import { selectScaleClass, type ScaleClass } from '../../shared/weighing/scale-selection';
import { evaluateZone, toleranceBand } from '../../shared/weighing/tolerance';
import { AuditEventRepository } from './audit-event.repository';
import { OverrideRepository } from './override.repository';
import { WeighingRecordRepository } from './weighing-record.repository';
import { WeighingSessionRepository } from './weighing-session.repository';

/**
 * Application service for the WeighingSession aggregate (ddd-01-domain-model.md, bolts 006 and
 * 008). Orchestrates stories 001–005, 011 (bolt 006) and 006–009, 013 (this bolt); overshoot and
 * batch completion are reserved for bolt 009.
 */
@Injectable()
export class WeighingSessionService {
  constructor(
    private readonly sessions: WeighingSessionRepository,
    private readonly records: WeighingRecordRepository,
    private readonly overrides: OverrideRepository,
    private readonly audit: AuditEventRepository,
    private readonly batchSelection: BatchSelectionService,
    private readonly writeBack: WriteBackService,
    @Inject(SCALE_PORT) private readonly scales: ScalePort,
    private readonly seed: SeedService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** Starts a session for a released batch, or resumes the station's existing one for it. */
  async start(batchId: string): Promise<SessionView> {
    const station = this.seed.get().station;
    const open = this.sessions.findOpenAtStation(station.stationId);
    if (open) {
      if (open.batchId === batchId) return open;
      throw new DomainError(
        'SESSION_ALREADY_OPEN',
        `Finish or abandon ${open.batchId} first`,
        409,
        { openBatchId: open.batchId },
      );
    }

    const { batch, recipe } = await this.batchSelection.prepareForWeighing(batchId);
    const operator = this.seed.getSessionOperator();
    const session: SessionView = {
      sessionId: randomUUID(),
      batchId,
      orderRef: batch.orderRef,
      machineRef: batch.machineRef,
      shadeCode: batch.shadeCode,
      stationId: station.stationId,
      operatorId: operator.operatorId,
      status: 'IN_PROGRESS',
      activeComponentId: null,
      startedAt: this.nowIso(),
      completedAt: null,
      components: recipe.components
        .slice()
        .sort((a, b) => a.sequence - b.sequence)
        .map((c): ComponentView => ({
          componentId: c.componentId,
          sequence: c.sequence,
          state: 'PENDING',
          dyestuff: c.dyestuff,
          lotId: c.lotId,
          containerId: c.containerId,
          scaleId: null,
          scaleClass: selectScaleClass(c.targetMg),
          uom: c.uom,
          targetMg: c.targetMg,
          toleranceMg: c.toleranceMg,
          displayMaxMg: c.displayMaxMg,
          tareMg: null,
          identity: 'UNVERIFIED',
          identityMismatchDetail: null,
        })),
    };
    this.sessions.save(session);

    const first = nextActive(session.components);
    // A recipe always has at least one component (brief: componentCount matches recipe length,
    // validated at seed time), so there is always a first component to activate.
    return first ? this.activateComponent(session.sessionId, first.componentId) : session;
  }

  get(sessionId: string): SessionView {
    return this.sessions.findById(sessionId);
  }

  /** Activates a pending component: resolves its scale and tares it (stories 001, 003). */
  async activateComponent(sessionId: string, componentId: string): Promise<SessionView> {
    const session = this.sessions.findById(sessionId);
    const target = this.component(session, componentId);

    if (target.state === 'DONE') {
      throw new DomainError('COMPONENT_DONE', `Component ${componentId} is already done`, 409, {
        componentId,
      });
    }
    if (target.state === 'ACTIVE') {
      return session; // already the active component — idempotent no-op
    }

    const tared = await this.selectAndTare(target);
    session.components = session.components.map((c) => {
      if (c.componentId === componentId) return tared;
      if (c.state === 'ACTIVE') return { ...c, state: 'PENDING' }; // story 003 AC5
      return c;
    });
    session.activeComponentId = componentId;

    this.sessions.save(session);
    return session;
  }

  /**
   * Re-tares the active component's scale without recording anything (story 004). This only
   * resets the scale's own live reading to zero — the component's recorded `tareMg` is always
   * the container master value (TD-4) and is unaffected by Re-tare.
   */
  async retare(sessionId: string): Promise<SessionView> {
    const session = this.sessions.findById(sessionId);
    const active = this.activeComponent(session);
    await this.scales.tare(this.scaleIdOf(active));
    return session;
  }

  /**
   * Scans a dyestuff barcode against the active component (story 007). A code that isn't a
   * dyestuff barcode at all (e.g. a batch card) is ignored — it neither verifies nor mismatches
   * (AC4 edge case). Dyestuff `code` and `barcode` are the same string in this training seed, so
   * comparing against the active component's own code is sufficient.
   */
  verifyIdentity(sessionId: string, code: string): SessionView {
    const session = this.sessions.findById(sessionId);
    const active = this.activeComponent(session);

    if (classifyScan(code) !== 'DYESTUFF') return session;

    const matches = code === active.dyestuff.code;
    session.components = session.components.map((c): ComponentView =>
      c.componentId === active.componentId
        ? {
            ...c,
            identity: matches ? 'VERIFIED' : 'MISMATCH',
            identityMismatchDetail: matches
              ? null
              : `Wrong dyestuff: scanned ${code}, expected ${active.dyestuff.code}`,
          }
        : c,
    );
    this.sessions.save(session);
    return session;
  }

  /**
   * Confirms the active component: the server reads the scale itself (never trusts a
   * client-supplied value) and only records the weighing when every safety check passes (story
   * 005). Advances to the next pending component (story 011).
   *
   * Check order (ddd-02-technical-design.md, resolving an ordering ambiguity left open by
   * ddd-01): scale reachable (propagated `SCALE_UNAVAILABLE`) → missing/unstable
   * (`READING_UNSTABLE`, unchanged from bolt 006) → present-but-impossible value
   * (`INVALID_READING`, new) → identity mismatch (`IDENTITY_MISMATCH`, new) → tolerance zone
   * (`OUT_OF_TOLERANCE`, unchanged).
   */
  async confirm(sessionId: string): Promise<ConfirmResult> {
    const session = this.sessions.findById(sessionId);
    const active = this.activeComponent(session);
    const scaleId = this.scaleIdOf(active);
    const tareMg = this.tareOf(active);

    const reading = await this.readAndValidate(scaleId);
    this.assertIdentityVerified(active);

    const band = toleranceBand(active.targetMg, active.toleranceMg);
    const zone = evaluateZone(reading.netMg, band);
    if (zone !== 'OK') {
      throw new DomainError('OUT_OF_TOLERANCE', 'The weight is outside tolerance', 422, {
        zone,
        readingMg: reading.netMg,
        minMg: band.minMg,
        maxMg: band.maxMg,
      });
    }

    const record: WeighingRecordView = {
      recordId: randomUUID(),
      sessionId,
      componentId: active.componentId,
      lotId: active.lotId,
      containerId: active.containerId,
      tareMg,
      scaleId,
      targetMg: active.targetMg,
      toleranceMinMg: band.minMg,
      toleranceMaxMg: band.maxMg,
      actualMg: reading.netMg,
      uom: active.uom,
      result: 'IN_TOLERANCE',
      operatorId: session.operatorId,
      confirmedAt: this.nowIso(),
      override: null,
    };
    return this.finishActive(sessionId, session, active, record);
  }

  /**
   * The supervisor's privileged variant of confirm (story 008): valid PIN + mandatory reason
   * authorises recording the active component's reading regardless of tolerance zone — but
   * override never bypasses reading safety or identity (ddd-01: "override only concerns
   * tolerance"), so the same scale/validity/identity checks as `confirm` still apply.
   */
  async authoriseOverride(sessionId: string, pin: string, reason: string): Promise<ConfirmResult> {
    const session = this.sessions.findById(sessionId);
    const active = this.activeComponent(session);
    const scaleId = this.scaleIdOf(active);
    const tareMg = this.tareOf(active);

    if (reason.trim().length === 0) {
      throw new DomainError('REASON_REQUIRED', 'Reason is required', 400);
    }
    const supervisor = this.seed.getSupervisor();
    if (!(await verifyPin(pin, supervisor.pinHash))) {
      throw new DomainError('SUPERVISOR_AUTH_FAILED', 'Supervisor authentication failed', 401);
    }

    const reading = await this.readAndValidate(scaleId);
    this.assertIdentityVerified(active);

    const band = toleranceBand(active.targetMg, active.toleranceMg);
    const authorisedAt = this.nowIso();
    const record: WeighingRecordView = {
      recordId: randomUUID(),
      sessionId,
      componentId: active.componentId,
      lotId: active.lotId,
      containerId: active.containerId,
      tareMg,
      scaleId,
      targetMg: active.targetMg,
      toleranceMinMg: band.minMg,
      toleranceMaxMg: band.maxMg,
      actualMg: reading.netMg,
      uom: active.uom,
      result: 'OVERRIDDEN',
      operatorId: session.operatorId,
      confirmedAt: authorisedAt,
      override: { supervisorId: supervisor.operatorId, reason, authorisedAt },
    };
    return this.finishActive(sessionId, session, active, record);
  }

  /**
   * Abandons the active component (story 009): re-tares its scale (no record kept, Invariant 7),
   * clears any identity mismatch (Invariant 8), returns it to `PENDING` (the one documented
   * exception to "never backwards", ddd-01), and audits the action. The session is left with no
   * active component — the operator must explicitly re-select one, same as any other pending row.
   */
  async quit(sessionId: string): Promise<SessionView> {
    const session = this.sessions.findById(sessionId);
    const active = this.activeComponent(session);
    const scaleId = this.scaleIdOf(active);

    let readingAtAbandonMg: number | null = null;
    try {
      readingAtAbandonMg = (await this.scales.readWeight(scaleId)).netMg;
    } catch {
      // Best-effort only — abandoning must stay possible even if the live reading can't be read.
    }
    await this.scales.tare(scaleId);

    session.components = session.components.map((c): ComponentView =>
      c.componentId === active.componentId
        ? {
            ...c,
            state: 'PENDING',
            scaleId: null,
            tareMg: null,
            identity: 'UNVERIFIED',
            identityMismatchDetail: null,
          }
        : c,
    );
    session.activeComponentId = null;
    this.sessions.save(session);

    const weightText =
      readingAtAbandonMg === null
        ? 'unknown reading'
        : formatWithUnit(readingAtAbandonMg, active.uom);
    this.audit.add({
      eventId: randomUUID(),
      sessionId,
      type: 'ABANDON',
      actorId: session.operatorId,
      detail: `Abandon: ${active.componentId} at ${weightText}`,
      occurredAt: this.nowIso(),
    });

    return session;
  }

  /**
   * Completes the batch and triggers the OrgaTEX write-back (story 012). Idempotent at this
   * layer (Invariant 9): an already-`COMPLETED` session returns the current summary unchanged
   * and never calls `WriteBackService.submit` again — `submit` is independently idempotent by
   * `sessionId` too (bolt 003), so neither layer depends on the other to be correct.
   */
  async complete(sessionId: string): Promise<CompletionResult> {
    const session = this.sessions.findById(sessionId);
    if (session.status === 'COMPLETED') {
      return { session, summary: this.buildSummary(session) };
    }
    if (session.components.some((c) => c.state !== 'DONE')) {
      throw new DomainError('BATCH_INCOMPLETE', 'Not every component has been weighed', 409, {
        componentsDone: session.components.filter((c) => c.state === 'DONE').length,
        componentsTotal: session.components.length,
      });
    }

    session.status = 'COMPLETED';
    session.completedAt = this.nowIso();
    this.sessions.save(session);

    const records = this.records.listBySession(sessionId);
    const lines: ConsumptionLine[] = records.map((r) => ({
      componentId: r.componentId,
      dyestuffCode: this.component(session, r.componentId).dyestuff.code,
      lotId: r.lotId,
      targetMg: r.targetMg,
      actualMg: r.actualMg,
      uom: r.uom,
      scaleId: r.scaleId,
      result: r.result,
    }));
    await this.writeBack.submit(sessionId, session.batchId, {
      stationId: session.stationId,
      operatorId: session.operatorId,
      completedAt: session.completedAt,
      lines,
    });

    return { session, summary: this.buildSummary(session) };
  }

  /** A pure, always-recomputed projection (story 012) — never restricted to a completed session. */
  getSummary(sessionId: string): BatchSummaryView {
    return this.buildSummary(this.sessions.findById(sessionId));
  }

  private buildSummary(session: SessionView): BatchSummaryView {
    const records = this.records.listBySession(session.sessionId);
    const operator = this.seed.getSessionOperator();
    let writeBack: BatchSummaryView['writeBack'] = null;
    try {
      writeBack = this.writeBack.get(session.sessionId);
    } catch (e) {
      if (!(e instanceof NotFoundError)) throw e;
    }
    return {
      sessionId: session.sessionId,
      batchId: session.batchId,
      componentsDone: session.components.filter((c) => c.state === 'DONE').length,
      componentsTotal: session.components.length,
      allWithinTolerance: records.every((r) => r.result !== 'OVERRIDDEN'),
      totalDispensedMg: records.reduce((sum, r) => sum + r.actualMg, 0),
      elapsedMs: session.completedAt
        ? Date.parse(session.completedAt) - Date.parse(session.startedAt)
        : null,
      operatorName: operator.name,
      writeBack,
    };
  }

  // ── Internals ────────────────────────────────────────────────────────

  /** Shared by `confirm` and `authoriseOverride`: store the record, progress, re-activate. */
  private async finishActive(
    sessionId: string,
    session: SessionView,
    active: ComponentView,
    record: WeighingRecordView,
  ): Promise<ConfirmResult> {
    this.records.add(record);
    if (record.override) {
      this.overrides.add({
        overrideId: randomUUID(),
        recordId: record.recordId,
        ...record.override,
      });
      const event: AuditEventView = {
        eventId: randomUUID(),
        sessionId,
        type: 'OVERRIDE',
        actorId: record.override.supervisorId,
        detail: `Override: ${active.componentId} at ${formatWithUnit(record.actualMg, record.uom)}, reason: ${record.override.reason}`,
        occurredAt: record.override.authorisedAt,
      };
      this.audit.add(event);
    }

    session.components = session.components.map((c): ComponentView =>
      c.componentId === active.componentId ? { ...c, state: 'DONE' } : c,
    );
    const next = nextActive(session.components);
    session.activeComponentId = next?.componentId ?? null;
    this.sessions.save(session);

    // Activating the next component (scale selection + tare) is identical to the touch-activate
    // path, so delegate to it rather than duplicating that logic (it re-reads and re-saves).
    const updated = next
      ? await this.activateComponent(sessionId, next.componentId)
      : this.sessions.findById(sessionId);
    return { record, session: updated };
  }

  /**
   * Reads the scale and rejects a missing/unstable or present-but-impossible value. Shared by
   * `confirm` and `authoriseOverride` — neither may record a reading the scale itself cannot
   * vouch for.
   */
  private async readAndValidate(scaleId: string): Promise<{ netMg: number }> {
    const reading = await this.scales.readWeight(scaleId);
    if (!reading.stable || reading.netMg === null) {
      throw new DomainError('READING_UNSTABLE', 'The scale reading is not yet stable', 422, {
        scaleId,
      });
    }
    const status = await this.scales.getStatus(scaleId);
    if (classifyReading(reading.netMg, status.capacityMg) === 'INVALID') {
      throw new DomainError('INVALID_READING', 'The scale reading is not physically valid', 422, {
        scaleId,
        netMg: reading.netMg,
      });
    }
    return { netMg: reading.netMg };
  }

  private assertIdentityVerified(active: ComponentView): void {
    if (active.identity === 'MISMATCH') {
      throw new DomainError(
        'IDENTITY_MISMATCH',
        active.identityMismatchDetail ?? 'Dyestuff identity does not match',
        409,
        { componentId: active.componentId },
      );
    }
  }

  private async selectAndTare(component: ComponentView): Promise<ComponentView> {
    const scale = await this.resolveScale(component.scaleClass);
    // Two different things happen here: the scale's own live reading is zeroed (an operational
    // reset, so the next poll starts at net 0), while the *recorded* tare is always the
    // container's known master value (TD-4) — the Dummy scale has no physical container to zero
    // against, so its own tare result is never used for display or traceability.
    await this.scales.tare(scale.scaleId);
    const tareMg = this.seed.getContainerTareMg(component.containerId);
    return { ...component, state: 'ACTIVE', scaleId: scale.scaleId, tareMg };
  }

  private async resolveScale(scaleClass: ScaleClass): Promise<{ scaleId: string }> {
    const scales = await this.scales.listScales();
    const match = scales.find((s) => s.class === scaleClass);
    if (!match) {
      throw new DomainError(
        'NO_SCALE_FOR_CLASS',
        `No scale configured for class ${scaleClass}`,
        500,
        {
          scaleClass,
        },
      );
    }
    return match;
  }

  private component(session: SessionView, componentId: string): ComponentView {
    const component = session.components.find((c) => c.componentId === componentId);
    if (!component) {
      throw new DomainError(
        'COMPONENT_NOT_FOUND',
        `No component ${componentId} in this session`,
        404,
        {
          componentId,
        },
      );
    }
    return component;
  }

  private activeComponent(session: SessionView): ComponentView {
    const active = session.components.find((c) => c.state === 'ACTIVE');
    if (!active) {
      throw new DomainError('COMPONENT_NOT_ACTIVE', 'No component is currently active', 409);
    }
    return active;
  }

  private scaleIdOf(component: ComponentView): string {
    if (!component.scaleId) {
      throw new DomainError('COMPONENT_NOT_ACTIVE', 'Component has not been activated', 409);
    }
    return component.scaleId;
  }

  private tareOf(component: ComponentView): number {
    if (component.tareMg === null) {
      throw new DomainError('COMPONENT_NOT_ACTIVE', 'Component has not been tared', 409);
    }
    return component.tareMg;
  }

  private nowIso(): string {
    return new Date(this.clock.now()).toISOString();
  }
}
