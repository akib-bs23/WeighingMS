import type { INestApplication } from '@nestjs/common';
import { DummyPrinterService } from '../../../src/server/integrations/printer/dummy/dummy-printer.service';
import { DummyScaleService } from '../../../src/server/integrations/scale/dummy/dummy-scale.service';
import { ResetRegistry } from '../../../src/server/training/reset.registry';
import { AuditEventRepository } from '../../../src/server/weighing/audit-event.repository';
import { WeighingSessionService } from '../../../src/server/weighing/weighing-session.service';
import { TicketService } from '../../../src/server/tickets/ticket.service';
import { createTestApp } from '../../helpers/create-test-app';

const FULL_BATCH_PLAN: [string, number][] = [
  ['scale-3kg', 1_241_500],
  ['scale-3kg', 385_400],
  ['scale-3kg', 94_200],
  ['scale-32kg', 23_980_000],
  ['scale-32kg', 9_621_000],
];

describe('TicketService', () => {
  let app: INestApplication;
  let tickets: TicketService;
  let sessions: WeighingSessionService;
  let scales: DummyScaleService;
  let printer: DummyPrinterService;
  let audit: AuditEventRepository;

  beforeAll(async () => {
    app = await createTestApp();
    tickets = app.get(TicketService);
    sessions = app.get(WeighingSessionService);
    scales = app.get(DummyScaleService);
    printer = app.get(DummyPrinterService);
    audit = app.get(AuditEventRepository);
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    app.get(ResetRegistry).resetAll();
  });

  async function completedSession(): Promise<string> {
    const session = await sessions.start('B-24187');
    for (const [scaleId, mg] of FULL_BATCH_PLAN) {
      scales.setWeight(scaleId, mg);
      await sessions.confirm(session.sessionId);
    }
    await sessions.complete(session.sessionId);
    return session.sessionId;
  }

  describe('submit', () => {
    it('rejects composing before the batch is completed with 409 BATCH_INCOMPLETE', async () => {
      const session = await sessions.start('B-24187');
      await expect(tickets.submit(session.sessionId)).rejects.toMatchObject({
        code: 'BATCH_INCOMPLETE',
        httpStatus: 409,
      });
    });

    it('composes the full B-24187 ticket matching the prototype content (story 002 AC1)', async () => {
      const sessionId = await completedSession();
      const state = await tickets.submit(sessionId);
      expect(state.status).toBe('PRINTED');
      expect(state.ticket).toMatchObject({
        batchId: 'B-24187',
        orderRef: 'SO-9931',
        machineRef: 'JET-04',
        shadeCode: 'Teal 4C',
        operatorName: 'R. Karim',
        toleranceSummary: 'ALL WITHIN TOLERANCE',
        barcodeValue: 'B-24187',
      });
      expect(state.ticket.lines).toEqual([
        { name: 'Remazol Brill. Blue RSPL', targetMg: 1_240_000, actualMg: 1_241_500, uom: 'g' },
        { name: 'Remazol Red RB', targetMg: 386_000, actualMg: 385_400, uom: 'g' },
        { name: 'Remazol Yellow RGB', targetMg: 94_000, actualMg: 94_200, uom: 'g' },
        { name: 'Sodium Sulphate', targetMg: 24_000_000, actualMg: 23_980_000, uom: 'kg' },
        { name: 'Soda Ash', targetMg: 9_600_000, actualMg: 9_621_000, uom: 'kg' },
      ]);
      expect(state.ticket.date).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    });

    it('is idempotent: a second call never recomposes, just returns the stored state', async () => {
      const sessionId = await completedSession();
      const first = await tickets.submit(sessionId);
      const second = await tickets.submit(sessionId);
      expect(second.ticket.ticketId).toBe(first.ticket.ticketId);
      expect(second.attempts).toBe(1);
    });

    it('stays PENDING with a lastError when the printer is offline', async () => {
      const sessionId = await completedSession();
      printer.setOnline(false);
      const state = await tickets.submit(sessionId);
      expect(state.status).toBe('PENDING');
      expect(state.lastError).toBe('PRINTER_UNAVAILABLE');
      printer.setOnline(true);
      const retried = await tickets.retry(sessionId);
      expect(retried.status).toBe('PRINTED');
    });
  });

  describe('get', () => {
    it('throws TICKET_NOT_FOUND before submit has been called', async () => {
      const session = await sessions.start('B-24187');
      expect(() => tickets.get(session.sessionId)).toThrow(
        expect.objectContaining({ code: 'TICKET_NOT_FOUND' }) as Error,
      );
    });

    it('returns the same state submit returned', async () => {
      const sessionId = await completedSession();
      const submitted = await tickets.submit(sessionId);
      expect(tickets.get(sessionId)).toEqual(submitted);
    });
  });

  describe('reprint', () => {
    it('rejects reprinting a ticket that has never been printed with 409 TICKET_NOT_PRINTED', async () => {
      const sessionId = await completedSession();
      printer.setOnline(false);
      await tickets.submit(sessionId); // stays PENDING
      printer.setOnline(true);
      await expect(tickets.reprint(sessionId)).rejects.toMatchObject({
        code: 'TICKET_NOT_PRINTED',
        httpStatus: 409,
      });
    });

    it('marks the new job isReprint and writes one REPRINT audit event (story 003 AC1)', async () => {
      const sessionId = await completedSession();
      await tickets.submit(sessionId);
      const reprinted = await tickets.reprint(sessionId);
      expect(reprinted.isReprint).toBe(true);
      expect(reprinted.attempts).toBe(2);
      const events = audit.listBySession(sessionId);
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({ type: 'REPRINT', actorId: 'OP-001' });
    });

    it('a failed reprint leaves the ticket PENDING and writes no audit event', async () => {
      const sessionId = await completedSession();
      await tickets.submit(sessionId);
      printer.setOnline(false);
      const failed = await tickets.reprint(sessionId);
      expect(failed.status).toBe('PENDING');
      expect(failed.lastError).toBe('PRINTER_UNAVAILABLE');
      expect(audit.listBySession(sessionId)).toHaveLength(0);
      printer.setOnline(true);
    });

    it('retrying a failed reprint attempt clears isReprint (story 003 AC2)', async () => {
      const sessionId = await completedSession();
      await tickets.submit(sessionId);
      printer.setOnline(false);
      await tickets.reprint(sessionId); // fails, still carries stale isReprint internally
      printer.setOnline(true);
      const retried = await tickets.retry(sessionId);
      expect(retried.status).toBe('PRINTED');
      expect(retried.isReprint).toBe(false);
    });
  });

  describe('training reset', () => {
    it('clears tickets so a new submit recomposes from scratch', async () => {
      const sessionId = await completedSession();
      await tickets.submit(sessionId);
      app.get(ResetRegistry).resetAll();
      expect(() => tickets.get(sessionId)).toThrow();
    });
  });
});
