import { hashPin, verifyPin } from '../../../../src/server/common/security/scrypt-pin';

describe('scrypt-pin', () => {
  it('a PIN verifies against its own hash', async () => {
    const hash = await hashPin('4825');
    expect(await verifyPin('4825', hash)).toBe(true);
  });

  it('a wrong PIN does not verify', async () => {
    const hash = await hashPin('4825');
    expect(await verifyPin('0000', hash)).toBe(false);
  });

  it('two hashes of the same PIN differ (random salt per hash)', async () => {
    const a = await hashPin('4825');
    const b = await hashPin('4825');
    expect(a).not.toBe(b);
    expect(await verifyPin('4825', a)).toBe(true);
    expect(await verifyPin('4825', b)).toBe(true);
  });

  it('verifies against the real seeded supervisor hash for the documented training PIN', async () => {
    // Matches data/seed.json's one supervisor (SV-001) — if this ever fails, the seed's
    // pinHash and this documented PIN have drifted out of sync.
    const seededHash =
      'scrypt$32dbc8f28462a3b26b1398f07a4abaae$6466824b66da91c260a9a346e7a7e3fa6f218e59af94891e5962fa547feb444d';
    expect(await verifyPin('4825', seededHash)).toBe(true);
    expect(await verifyPin('0000', seededHash)).toBe(false);
  });

  it('rejects a malformed stored hash instead of throwing', async () => {
    expect(await verifyPin('4825', 'not-a-valid-hash')).toBe(false);
    expect(await verifyPin('4825', 'scrypt$onlyonepart')).toBe(false);
  });
});
