import { SeedService } from '../../../src/server/training/seed/seed.service';

describe('SeedService', () => {
  // Uses the default seed path (data/seed.json), same as every other SeedService consumer.
  const service = new SeedService();

  describe('getSessionOperator', () => {
    it('returns the fixed training operator (TD-6)', () => {
      expect(service.getSessionOperator()).toEqual({
        operatorId: 'OP-001',
        name: 'R. Karim',
        shift: 'Shift A',
      });
    });
  });

  describe('getSupervisor', () => {
    it('returns the seeded supervisor credential (story 008)', () => {
      const supervisor = service.getSupervisor();
      expect(supervisor.operatorId).toBe('SV-001');
      expect(supervisor.pinHash).toMatch(/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{64}$/);
    });
  });

  describe('getContainerTareMg', () => {
    it.each([
      ['C-09', 214_000],
      ['C-11', 214_000],
      ['C-12', 214_000],
      ['D-03', 1_850_000],
      ['D-05', 1_850_000],
    ])('returns the container master tare for %s', (containerId, expected) => {
      expect(service.getContainerTareMg(containerId)).toBe(expected);
    });

    it('throws NO_CONTAINER_MASTER for an unknown container', () => {
      expect(() => service.getContainerTareMg('nope')).toThrow(
        expect.objectContaining({ code: 'NO_CONTAINER_MASTER' }) as Error,
      );
    });
  });
});
