import type { INestApplication } from '@nestjs/common';
import { DummyOrgatexService } from '../../../src/server/integrations/orgatex/dummy/dummy-orgatex.service';
import { DummyScaleService } from '../../../src/server/integrations/scale/dummy/dummy-scale.service';
import { ResetRegistry } from '../../../src/server/training/reset.registry';
import { AuditEventRepository } from '../../../src/server/weighing/audit-event.repository';
import { WeighingRecordRepository } from '../../../src/server/weighing/weighing-record.repository';
import { WeighingSessionService } from '../../../src/server/weighing/weighing-session.service';
import { createTestApp } from '../../helpers/create-test-app';

const SUPERVISOR_PIN = '4825'; // documented training PIN (implementation-walkthrough.md, bolt 008)

const FULL_BATCH_PLAN: [string, number][] = [
  ['scale-3kg', 1_241_500],
  ['scale-3kg', 385_400],
  ['scale-3kg', 94_200],
  ['scale-32kg', 23_980_000],
  ['scale-32kg', 9_621_000],
];

describe('WeighingSessionService', () => {
  let app: INestApplication;
  let sessions: WeighingSessionService;
  let records: WeighingRecordRepository;
  let audit: AuditEventRepository;
  let scales: DummyScaleService;
  let orgatex: DummyOrgatexService;

  const setWeight = (scaleId: string, netMg: number) => {
    scales.setWeight(scaleId, netMg);
  };

  const weighAllFive = async (sessionId: string) => {
    for (const [scaleId, mg] of FULL_BATCH_PLAN) {
      setWeight(scaleId, mg);
      await sessions.confirm(sessionId);
    }
  };

  beforeAll(async () => {
    app = await createTestApp();
    sessions = app.get(WeighingSessionService);
    records = app.get(WeighingRecordRepository);
    audit = app.get(AuditEventRepository);
    scales = app.get(DummyScaleService);
    orgatex = app.get(DummyOrgatexService);
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    app.get(ResetRegistry).resetAll();
  });

  describe('start', () => {
    it('creates a session with all 5 components pending and the first active and tared', async () => {
      const session = await sessions.start('B-24187');
      expect(session).toMatchObject({
        batchId: 'B-24187',
        stationId: 'STN-01',
        operatorId: 'OP-001',
        status: 'IN_PROGRESS',
        activeComponentId: 'RC-24187-01',
        completedAt: null,
      });
      expect(session.components).toHaveLength(5);
      expect(session.components.map((c) => c.state)).toEqual([
        'ACTIVE',
        'PENDING',
        'PENDING',
        'PENDING',
        'PENDING',
      ]);
      const first = session.components[0];
      expect(first).toMatchObject({
        componentId: 'RC-24187-01',
        scaleId: 'scale-3kg',
        scaleClass: 'PRECISION',
        tareMg: 214_000, // container master tare for C-09 (TD-4), not the scale's own tare
        targetMg: 1_240_000,
        lotId: '2026-0341',
        containerId: 'C-09',
      });
      expect(first?.dyestuff).toMatchObject({ code: 'DYE-1180', name: 'Remazol Brill. Blue RSPL' });
      expect(Number.isNaN(Date.parse(session.startedAt))).toBe(false);
    });

    it('resumes the same session when called again for the same batch', async () => {
      const first = await sessions.start('B-24187');
      setWeight('scale-3kg', first.components[0]?.targetMg ?? 0);
      await sessions.confirm(first.sessionId);
      const resumed = await sessions.start('B-24187');
      expect(resumed.sessionId).toBe(first.sessionId);
      expect(resumed.components[0]?.state).toBe('DONE');
      expect(resumed.activeComponentId).toBe('RC-24187-02');
    });

    it('rejects starting a different batch while one is open (AS-6)', async () => {
      await sessions.start('B-24187');
      await expect(sessions.start('B-24188')).rejects.toMatchObject({
        code: 'SESSION_ALREADY_OPEN',
        httpStatus: 409,
        details: { openBatchId: 'B-24187' },
      });
    });

    it('propagates batch eligibility and OrgaTEX errors unchanged', async () => {
      await expect(sessions.start('B-24188')).rejects.toMatchObject({
        code: 'BATCH_NOT_RELEASED',
      });
      await expect(sessions.start('B-99999')).rejects.toMatchObject({ code: 'BATCH_NOT_FOUND' });
    });
  });

  describe('get', () => {
    it('reloads a session by id (resume after reload, NFR-6)', async () => {
      const started = await sessions.start('B-24187');
      const reloaded = sessions.get(started.sessionId);
      expect(reloaded).toEqual(started);
    });

    it('throws SESSION_NOT_FOUND for an unknown id', () => {
      expect(() => sessions.get('nope')).toThrow(
        expect.objectContaining({ code: 'SESSION_NOT_FOUND', httpStatus: 404 }) as Error,
      );
    });
  });

  describe('activateComponent', () => {
    it('selects the floor scale and tares it for a bulk component', async () => {
      const session = await sessions.start('B-24187');
      const updated = await sessions.activateComponent(session.sessionId, 'RC-24187-04');
      const sodiumSulphate = updated.components.find((c) => c.componentId === 'RC-24187-04');
      expect(sodiumSulphate).toMatchObject({
        state: 'ACTIVE',
        scaleId: 'scale-32kg',
        scaleClass: 'FLOOR',
        tareMg: 1_850_000, // container master tare for D-03 (1.850 kg, story 003 AC2)
      });
      expect(updated.activeComponentId).toBe('RC-24187-04');
    });

    it('returns the previously active component to pending without a record (story 003 AC5)', async () => {
      const session = await sessions.start('B-24187');
      const updated = await sessions.activateComponent(session.sessionId, 'RC-24187-03');
      const first = updated.components.find((c) => c.componentId === 'RC-24187-01');
      expect(first?.state).toBe('PENDING');
      expect(records.listBySession(session.sessionId)).toHaveLength(0);
    });

    it('is idempotent when activating the already-active component', async () => {
      const session = await sessions.start('B-24187');
      const again = await sessions.activateComponent(
        session.sessionId,
        session.activeComponentId ?? '',
      );
      expect(again).toEqual(session);
    });

    it('rejects activating a done component with 409 COMPONENT_DONE', async () => {
      const session = await sessions.start('B-24187');
      setWeight('scale-3kg', 1_240_000);
      await sessions.confirm(session.sessionId);
      await expect(
        sessions.activateComponent(session.sessionId, 'RC-24187-01'),
      ).rejects.toMatchObject({
        code: 'COMPONENT_DONE',
        httpStatus: 409,
      });
    });

    it('rejects an unknown component with 404', async () => {
      const session = await sessions.start('B-24187');
      await expect(sessions.activateComponent(session.sessionId, 'nope')).rejects.toMatchObject({
        code: 'COMPONENT_NOT_FOUND',
        httpStatus: 404,
      });
    });
  });

  describe('retare', () => {
    it('zeroes the live scale reading without creating a record', async () => {
      const session = await sessions.start('B-24187');
      setWeight('scale-3kg', 50_000);
      const retared = await sessions.retare(session.sessionId);
      const weight = scales.readWeight('scale-3kg');
      expect(weight.netMg).toBe(0);
      expect(records.listBySession(session.sessionId)).toHaveLength(0);
      // Re-tare resets the scale's own live reading only; the recorded container tare (TD-4) is
      // unaffected, unlike the old (incorrect) behaviour of pulling tareMg from the scale itself.
      const active = retared.components.find((c) => c.componentId === retared.activeComponentId);
      expect(active?.tareMg).toBe(214_000);
    });

    it('does not change the session at all (nothing persisted changes)', async () => {
      const session = await sessions.start('B-24187');
      setWeight('scale-3kg', 50_000);
      const retared = await sessions.retare(session.sessionId);
      expect(retared).toEqual(session);
    });
  });

  describe('confirm', () => {
    it('records the weighing with full traceability and confirms IN_TOLERANCE', async () => {
      const session = await sessions.start('B-24187');
      setWeight('scale-3kg', 1_241_500);
      const result = await sessions.confirm(session.sessionId);
      expect(result.record).toMatchObject({
        sessionId: session.sessionId,
        componentId: 'RC-24187-01',
        lotId: '2026-0341',
        containerId: 'C-09',
        tareMg: 214_000,
        scaleId: 'scale-3kg',
        targetMg: 1_240_000,
        toleranceMinMg: 1_234_000,
        toleranceMaxMg: 1_246_000,
        actualMg: 1_241_500,
        uom: 'g',
        result: 'IN_TOLERANCE',
        operatorId: 'OP-001',
      });
      expect(Number.isNaN(Date.parse(result.record.confirmedAt))).toBe(false);
    });

    it.each([93_400, 94_600])(
      'rejects %i mg as OUT_OF_TOLERANCE (422) and records nothing',
      async (mg) => {
        const session = await sessions.start('B-24187');
        await sessions.activateComponent(session.sessionId, 'RC-24187-03'); // Yellow RGB, 94.0 ±0.5 g
        setWeight('scale-3kg', mg);
        await expect(sessions.confirm(session.sessionId)).rejects.toMatchObject({
          code: 'OUT_OF_TOLERANCE',
          httpStatus: 422,
        });
        expect(records.listBySession(session.sessionId)).toHaveLength(0);
      },
    );

    it.each([93_500, 94_000, 94_500])('accepts %i mg (inclusive boundaries)', async (mg) => {
      const session = await sessions.start('B-24187');
      await sessions.activateComponent(session.sessionId, 'RC-24187-03');
      setWeight('scale-3kg', mg);
      const result = await sessions.confirm(session.sessionId);
      expect(result.record.actualMg).toBe(mg);
    });

    it('rejects an unstable reading with 422 READING_UNSTABLE and records nothing', async () => {
      const session = await sessions.start('B-24187');
      scales.startRamp('scale-3kg', 1_241_500, 60_000); // long ramp stays unstable
      await expect(sessions.confirm(session.sessionId)).rejects.toMatchObject({
        code: 'READING_UNSTABLE',
        httpStatus: 422,
      });
      expect(records.listBySession(session.sessionId)).toHaveLength(0);
    });

    it.each([
      ['a negative reading', -5_000],
      ['an overload reading (3 500 g on the 3 kg scale)', 3_500_000],
    ])('rejects %s with 422 INVALID_READING and records nothing (story 006 AC2)', async (_, mg) => {
      const session = await sessions.start('B-24187');
      setWeight('scale-3kg', mg);
      await expect(sessions.confirm(session.sessionId)).rejects.toMatchObject({
        code: 'INVALID_READING',
        httpStatus: 422,
        details: { scaleId: 'scale-3kg', netMg: mg },
      });
      expect(records.listBySession(session.sessionId)).toHaveLength(0);
    });

    it('an invalid reading is never evaluated for tolerance (checked before OUT_OF_TOLERANCE)', async () => {
      // -5 g is also "outside tolerance" by any zone rule, but INVALID_READING must win.
      const session = await sessions.start('B-24187');
      setWeight('scale-3kg', -5_000);
      await expect(sessions.confirm(session.sessionId)).rejects.toMatchObject({
        code: 'INVALID_READING',
      });
    });

    it('does not reclassify a missing (NO_READING fault) reading as INVALID — stays READING_UNSTABLE', async () => {
      const session = await sessions.start('B-24187');
      scales.setFault('scale-3kg', 'NO_READING');
      await expect(sessions.confirm(session.sessionId)).rejects.toMatchObject({
        code: 'READING_UNSTABLE',
      });
    });

    it('rejects confirm with 409 IDENTITY_MISMATCH when the scanned dyestuff does not match, even in tolerance (story 007 AC2)', async () => {
      const session = await sessions.start('B-24187');
      sessions.verifyIdentity(session.sessionId, 'DYE-2204'); // Red RB's code, wrong for Blue RSPL
      setWeight('scale-3kg', 1_241_500); // in tolerance
      await expect(sessions.confirm(session.sessionId)).rejects.toMatchObject({
        code: 'IDENTITY_MISMATCH',
        httpStatus: 409,
        message: 'Wrong dyestuff: scanned DYE-2204, expected DYE-1180',
      });
      expect(records.listBySession(session.sessionId)).toHaveLength(0);
    });

    it('allows confirm once the mismatch is cleared by scanning the correct code', async () => {
      const session = await sessions.start('B-24187');
      sessions.verifyIdentity(session.sessionId, 'DYE-2204');
      sessions.verifyIdentity(session.sessionId, 'DYE-1180'); // correct — clears it
      setWeight('scale-3kg', 1_241_500);
      const result = await sessions.confirm(session.sessionId);
      expect(result.record.result).toBe('IN_TOLERANCE');
    });

    it('allows confirm with no scan at all (light verification, story 007 AC4)', async () => {
      const session = await sessions.start('B-24187');
      setWeight('scale-3kg', 1_241_500);
      const result = await sessions.confirm(session.sessionId);
      expect(result.record.result).toBe('IN_TOLERANCE');
    });

    it('every IN_TOLERANCE record carries override: null', async () => {
      const session = await sessions.start('B-24187');
      setWeight('scale-3kg', 1_241_500);
      const result = await sessions.confirm(session.sessionId);
      expect(result.record.override).toBeNull();
    });

    it('reads the scale itself rather than trusting any client input (story 005 AC4)', async () => {
      // confirm() takes no reading parameter at all — this is a structural guarantee, asserted
      // by TypeScript at compile time (the method signature is `confirm(sessionId: string)`), and
      // demonstrated here by observing the server takes whatever the scale currently reports.
      const session = await sessions.start('B-24187');
      setWeight('scale-3kg', 1_241_500);
      const result = await sessions.confirm(session.sessionId);
      expect(result.record.actualMg).toBe(1_241_500);
    });

    it('progresses Blue RSPL -> Red RB -> Yellow RGB -> Sodium Sulphate -> Soda Ash in order', async () => {
      const session = await sessions.start('B-24187');
      const sequence = [
        ['scale-3kg', 1_241_500],
        ['scale-3kg', 385_400],
        ['scale-3kg', 94_200],
        ['scale-32kg', 23_980_000],
        ['scale-32kg', 9_621_000],
      ] as const;
      const order: (string | null)[] = [];
      for (const [scaleId, mg] of sequence) {
        order.push(sessions.get(session.sessionId).activeComponentId);
        setWeight(scaleId, mg);
        await sessions.confirm(session.sessionId);
      }
      expect(order).toEqual([
        'RC-24187-01',
        'RC-24187-02',
        'RC-24187-03',
        'RC-24187-04',
        'RC-24187-05',
      ]);
      const final = sessions.get(session.sessionId);
      expect(final.activeComponentId).toBeNull();
      expect(final.components.every((c) => c.state === 'DONE')).toBe(true);
      const total = records
        .listBySession(session.sessionId)
        .reduce((sum, r) => sum + r.actualMg, 0);
      // Exact sum across both units is 35 322 100 mg (35.3221 kg) — rounds to the prototype's
      // displayed "35.322 kg" at gram precision (bolt 007's formatQuantity), not a coincidence.
      expect(total).toBe(35_322_100);
    });

    it('switches scale and unit when progressing from Yellow RGB to Sodium Sulphate (workbook Step 21)', async () => {
      const session = await sessions.start('B-24187');
      // Confirm Blue RSPL and Red RB first, in order, so Yellow RGB really is next (otherwise
      // jumping straight to it would send components 1–2 back to pending and progression would
      // correctly return to them first — see story 011's "operator jumped ahead" edge case).
      setWeight('scale-3kg', 1_241_500);
      await sessions.confirm(session.sessionId);
      setWeight('scale-3kg', 385_400);
      await sessions.confirm(session.sessionId);

      setWeight('scale-3kg', 94_200);
      const result = await sessions.confirm(session.sessionId);
      const nextComponent = result.session.components.find(
        (c) => c.componentId === result.session.activeComponentId,
      );
      expect(nextComponent).toMatchObject({
        componentId: 'RC-24187-04',
        scaleId: 'scale-32kg',
        uom: 'kg',
      });
    });

    it('jumping ahead returns progression to the lowest-sequence pending component (story 011 edge case)', async () => {
      const session = await sessions.start('B-24187');
      // Blue RSPL (1) is active; jump straight to Yellow RGB (3) without confirming 1 or 2.
      await sessions.activateComponent(session.sessionId, 'RC-24187-03');
      setWeight('scale-3kg', 94_200);
      const result = await sessions.confirm(session.sessionId);
      // Component 1 was sent back to PENDING when 3 was touch-activated, so it — not component 4
      // — is the next one progression picks.
      expect(result.session.activeComponentId).toBe('RC-24187-01');
      const components = Object.fromEntries(
        result.session.components.map((c) => [c.componentId, c.state]),
      );
      expect(components).toMatchObject({
        'RC-24187-01': 'ACTIVE',
        'RC-24187-02': 'PENDING',
        'RC-24187-03': 'DONE',
        'RC-24187-04': 'PENDING',
      });
    });
  });

  describe('verifyIdentity', () => {
    it("verifies the active component's own code", async () => {
      const session = await sessions.start('B-24187');
      const updated = sessions.verifyIdentity(session.sessionId, 'DYE-1180');
      const active = updated.components.find((c) => c.componentId === updated.activeComponentId);
      expect(active).toMatchObject({ identity: 'VERIFIED', identityMismatchDetail: null });
    });

    it('sets MISMATCH with the exact wording when a different dyestuff is scanned (story 007 AC2)', async () => {
      const session = await sessions.start('B-24187');
      const updated = sessions.verifyIdentity(session.sessionId, 'DYE-2204');
      const active = updated.components.find((c) => c.componentId === updated.activeComponentId);
      expect(active).toMatchObject({
        identity: 'MISMATCH',
        identityMismatchDetail: 'Wrong dyestuff: scanned DYE-2204, expected DYE-1180',
      });
    });

    it('clears a mismatch when the correct code is scanned next (story 007 AC3)', async () => {
      const session = await sessions.start('B-24187');
      sessions.verifyIdentity(session.sessionId, 'DYE-2204');
      const updated = sessions.verifyIdentity(session.sessionId, 'DYE-1180');
      const active = updated.components.find((c) => c.componentId === updated.activeComponentId);
      expect(active).toMatchObject({ identity: 'VERIFIED', identityMismatchDetail: null });
    });

    it('ignores a batch-card code — neither verifies nor mismatches (story 007 edge case)', async () => {
      const session = await sessions.start('B-24187');
      const updated = sessions.verifyIdentity(session.sessionId, 'B-24187');
      const active = updated.components.find((c) => c.componentId === updated.activeComponentId);
      expect(active?.identity).toBe('UNVERIFIED');
    });

    it('ignores an unrecognised code shape — neither verifies nor mismatches', async () => {
      const session = await sessions.start('B-24187');
      const updated = sessions.verifyIdentity(session.sessionId, 'not-a-code');
      const active = updated.components.find((c) => c.componentId === updated.activeComponentId);
      expect(active?.identity).toBe('UNVERIFIED');
    });

    it('throws COMPONENT_NOT_ACTIVE when nothing is active', async () => {
      const session = await sessions.start('B-24187');
      await sessions.quit(session.sessionId);
      expect(() => sessions.verifyIdentity(session.sessionId, 'DYE-1180')).toThrow(
        expect.objectContaining({ code: 'COMPONENT_NOT_ACTIVE' }) as Error,
      );
    });
  });

  describe('authoriseOverride', () => {
    it('authorises an under-tolerance reading with a valid PIN and reason (story 008 AC1)', async () => {
      const session = await sessions.start('B-24187');
      setWeight('scale-3kg', 93_000); // under Blue RSPL's own tolerance band too, but any zone works
      const result = await sessions.authoriseOverride(
        session.sessionId,
        SUPERVISOR_PIN,
        'Lab approved',
      );
      expect(result.record).toMatchObject({
        result: 'OVERRIDDEN',
        actualMg: 93_000,
        override: { supervisorId: 'SV-001', reason: 'Lab approved' },
      });
      expect(Number.isNaN(Date.parse(result.record.override?.authorisedAt ?? ''))).toBe(false);
      // Progresses exactly like a normal confirm.
      expect(result.session.activeComponentId).toBe('RC-24187-02');
    });

    it('creates exactly one OVERRIDE audit event (story 013 AC2)', async () => {
      const session = await sessions.start('B-24187');
      setWeight('scale-3kg', 93_000);
      await sessions.authoriseOverride(session.sessionId, SUPERVISOR_PIN, 'Lab approved');
      const events = audit.listBySession(session.sessionId);
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: 'OVERRIDE',
        actorId: 'SV-001',
        detail: 'Override: RC-24187-01 at 93.0 g, reason: Lab approved',
      });
    });

    it('rejects a wrong PIN with 401 SUPERVISOR_AUTH_FAILED and records nothing (story 008 AC2)', async () => {
      const session = await sessions.start('B-24187');
      setWeight('scale-3kg', 93_000);
      await expect(
        sessions.authoriseOverride(session.sessionId, '0000', 'Lab approved'),
      ).rejects.toMatchObject({
        code: 'SUPERVISOR_AUTH_FAILED',
        httpStatus: 401,
        message: 'Supervisor authentication failed',
      });
      expect(records.listBySession(session.sessionId)).toHaveLength(0);
    });

    it('rejects an empty reason with 400 REASON_REQUIRED and records nothing (story 008 AC3)', async () => {
      const session = await sessions.start('B-24187');
      setWeight('scale-3kg', 93_000);
      await expect(
        sessions.authoriseOverride(session.sessionId, SUPERVISOR_PIN, '   '),
      ).rejects.toMatchObject({ code: 'REASON_REQUIRED', httpStatus: 400 });
      expect(records.listBySession(session.sessionId)).toHaveLength(0);
    });

    it('never exposes the PIN in a thrown error (NFR-11)', async () => {
      const session = await sessions.start('B-24187');
      const error = await sessions
        .authoriseOverride(session.sessionId, 'secret-pin-0000', 'reason')
        .catch((e: unknown) => e);
      expect(error).toMatchObject({ code: 'SUPERVISOR_AUTH_FAILED' });
      expect(JSON.stringify(error)).not.toContain('secret-pin-0000');
      expect((error as Error).message).not.toContain('secret-pin-0000');
    });

    it('still rejects an invalid reading with 422 INVALID_READING — override never bypasses reading safety', async () => {
      const session = await sessions.start('B-24187');
      setWeight('scale-3kg', -5_000);
      await expect(
        sessions.authoriseOverride(session.sessionId, SUPERVISOR_PIN, 'reason'),
      ).rejects.toMatchObject({ code: 'INVALID_READING' });
    });

    it('still rejects an identity mismatch with 409 — override never bypasses identity (ddd-01)', async () => {
      const session = await sessions.start('B-24187');
      sessions.verifyIdentity(session.sessionId, 'DYE-2204');
      setWeight('scale-3kg', 93_000);
      await expect(
        sessions.authoriseOverride(session.sessionId, SUPERVISOR_PIN, 'reason'),
      ).rejects.toMatchObject({ code: 'IDENTITY_MISMATCH' });
    });

    it('authorises an OVER-zone reading too (story 008 AC5: allowed with reason until the Step 24 decision)', async () => {
      const session = await sessions.start('B-24187');
      setWeight('scale-3kg', 1_300_000); // well above Blue RSPL's tolerance max
      const result = await sessions.authoriseOverride(
        session.sessionId,
        SUPERVISOR_PIN,
        'Known surplus, approved',
      );
      expect(result.record.result).toBe('OVERRIDDEN');
    });
  });

  describe('quit', () => {
    it('returns the active component to PENDING with no record and a fresh scale/tare/identity (story 009 AC1)', async () => {
      const session = await sessions.start('B-24187');
      sessions.verifyIdentity(session.sessionId, 'DYE-2204'); // leave a mismatch in place
      setWeight('scale-3kg', 60_000);
      const updated = await sessions.quit(session.sessionId);
      expect(updated.activeComponentId).toBeNull();
      const first = updated.components.find((c) => c.componentId === 'RC-24187-01');
      expect(first).toMatchObject({
        state: 'PENDING',
        scaleId: null,
        tareMg: null,
        identity: 'UNVERIFIED',
        identityMismatchDetail: null,
      });
      expect(records.listBySession(session.sessionId)).toHaveLength(0);
    });

    it('re-tares the scale (zeroes the live reading)', async () => {
      const session = await sessions.start('B-24187');
      setWeight('scale-3kg', 60_000);
      await sessions.quit(session.sessionId);
      expect(scales.readWeight('scale-3kg').netMg).toBe(0);
    });

    it('creates exactly one ABANDON audit event, even at a reading of 0 (story 009 edge case)', async () => {
      const session = await sessions.start('B-24187');
      setWeight('scale-3kg', 0);
      await sessions.quit(session.sessionId);
      const events = audit.listBySession(session.sessionId);
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: 'ABANDON',
        actorId: 'OP-001',
        detail: 'Abandon: RC-24187-01 at 0.0 g',
      });
    });

    it('a quit component can be re-activated from scratch afterwards', async () => {
      const session = await sessions.start('B-24187');
      setWeight('scale-3kg', 60_000);
      await sessions.quit(session.sessionId);
      const reactivated = await sessions.activateComponent(session.sessionId, 'RC-24187-01');
      const first = reactivated.components.find((c) => c.componentId === 'RC-24187-01');
      expect(first).toMatchObject({ state: 'ACTIVE', scaleId: 'scale-3kg', tareMg: 214_000 });
    });

    it('throws COMPONENT_NOT_ACTIVE when nothing is active', async () => {
      const session = await sessions.start('B-24187');
      await sessions.quit(session.sessionId);
      await expect(sessions.quit(session.sessionId)).rejects.toMatchObject({
        code: 'COMPONENT_NOT_ACTIVE',
      });
    });
  });

  describe('complete', () => {
    it('rejects an incomplete batch with 409 BATCH_INCOMPLETE', async () => {
      const session = await sessions.start('B-24187');
      await expect(sessions.complete(session.sessionId)).rejects.toMatchObject({
        code: 'BATCH_INCOMPLETE',
        httpStatus: 409,
        details: { componentsDone: 0, componentsTotal: 5 },
      });
    });

    it('completes at 5 of 5 with the prototype actuals, total 35.3221 kg (story 012 AC3)', async () => {
      const session = await sessions.start('B-24187');
      await weighAllFive(session.sessionId);
      const result = await sessions.complete(session.sessionId);
      expect(result.session.status).toBe('COMPLETED');
      expect(Number.isNaN(Date.parse(result.session.completedAt ?? ''))).toBe(false);
      expect(result.summary).toMatchObject({
        componentsDone: 5,
        componentsTotal: 5,
        allWithinTolerance: true,
        totalDispensedMg: 35_322_100,
        operatorName: 'R. Karim',
      });
      expect(result.summary.elapsedMs).toBeGreaterThanOrEqual(0);
    });

    it('triggers the OrgaTEX write-back and confirms it in the summary', async () => {
      const session = await sessions.start('B-24187');
      await weighAllFive(session.sessionId);
      const result = await sessions.complete(session.sessionId);
      expect(result.summary.writeBack).toMatchObject({ status: 'CONFIRMED', attempts: 1 });
      expect(Number.isNaN(Date.parse(result.summary.writeBack?.confirmedAt ?? ''))).toBe(false);
    });

    it('reports allWithinTolerance: false when any component was OVERRIDDEN', async () => {
      const session = await sessions.start('B-24187');
      setWeight('scale-3kg', 93_000); // under tolerance
      await sessions.authoriseOverride(session.sessionId, SUPERVISOR_PIN, 'Lab approved');
      setWeight('scale-3kg', 385_400);
      await sessions.confirm(session.sessionId);
      setWeight('scale-3kg', 94_200);
      await sessions.confirm(session.sessionId);
      setWeight('scale-32kg', 23_980_000);
      await sessions.confirm(session.sessionId);
      setWeight('scale-32kg', 9_621_000);
      await sessions.confirm(session.sessionId);
      const result = await sessions.complete(session.sessionId);
      expect(result.summary.allWithinTolerance).toBe(false);
    });

    it('is idempotent: a second call returns the same summary and never double-posts (story 012 edge case)', async () => {
      const session = await sessions.start('B-24187');
      await weighAllFive(session.sessionId);
      const first = await sessions.complete(session.sessionId);
      const second = await sessions.complete(session.sessionId);
      expect(second.summary).toEqual(first.summary);
      expect(second.summary.writeBack?.attempts).toBe(1);
    });

    it('still completes locally when OrgaTEX is unavailable, write-back stays PENDING', async () => {
      const session = await sessions.start('B-24187');
      await weighAllFive(session.sessionId);
      orgatex.setOnline(false);
      const result = await sessions.complete(session.sessionId);
      expect(result.session.status).toBe('COMPLETED');
      expect(result.summary.writeBack).toMatchObject({
        status: 'PENDING',
        lastError: 'ORGATEX_UNAVAILABLE',
      });
      orgatex.setOnline(true);
    });
  });

  describe('getSummary', () => {
    it('is available before completion as a live progress read, with no write-back yet', async () => {
      const session = await sessions.start('B-24187');
      setWeight('scale-3kg', 1_241_500);
      await sessions.confirm(session.sessionId);
      const summary = sessions.getSummary(session.sessionId);
      expect(summary).toMatchObject({ componentsDone: 1, componentsTotal: 5 });
      expect(summary.elapsedMs).toBeNull();
      expect(summary.writeBack).toBeNull();
    });

    it('matches the summary returned by complete, recomputed fresh on every call', async () => {
      const session = await sessions.start('B-24187');
      await weighAllFive(session.sessionId);
      const completed = await sessions.complete(session.sessionId);
      expect(sessions.getSummary(session.sessionId)).toEqual(completed.summary);
    });

    it('throws SESSION_NOT_FOUND for an unknown session', () => {
      expect(() => sessions.getSummary('nope')).toThrow(
        expect.objectContaining({ code: 'SESSION_NOT_FOUND' }) as Error,
      );
    });
  });

  describe('training reset', () => {
    it('clears sessions and records so the next start never hits SESSION_ALREADY_OPEN', async () => {
      const session = await sessions.start('B-24187');
      setWeight('scale-3kg', 1_241_500);
      await sessions.confirm(session.sessionId);

      app.get(ResetRegistry).resetAll();

      expect(() => sessions.get(session.sessionId)).toThrow();
      const restarted = await sessions.start('B-24187');
      expect(restarted.sessionId).not.toBe(session.sessionId);
      expect(restarted.components.every((c) => c.state === 'PENDING' || c.state === 'ACTIVE')).toBe(
        true,
      );
    });
  });

  describe('performance', () => {
    it('confirms within a reasonable local latency budget', async () => {
      const session = await sessions.start('B-24187');
      setWeight('scale-3kg', 1_241_500);
      const start = performance.now();
      await sessions.confirm(session.sessionId);
      expect(performance.now() - start).toBeLessThan(50);
    });
  });
});
