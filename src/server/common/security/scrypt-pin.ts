import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 32;

/** Hashes a PIN as `scrypt$<saltHex>$<hashHex>` — the format the training seed already uses. */
export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scryptAsync(pin, salt, KEY_LENGTH)) as Buffer;
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}

/**
 * Verifies a PIN against a stored `scrypt$<saltHex>$<hashHex>` hash. Uses a constant-time
 * comparison (`timingSafeEqual`) rather than `===` so a wrong-PIN attempt can't be timed to
 * learn anything about the stored hash (NFR-11) — cheap correctness, even for a training-only
 * credential.
 */
export async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  const [scheme, saltHex, hashHex] = storedHash.split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  const derived = (await scryptAsync(pin, salt, expected.length)) as Buffer;
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}
