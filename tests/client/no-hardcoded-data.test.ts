import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The UI must obtain all data from the API; no scenario data may be embedded in UI components
 * (workbook Rule 5). Scans every client source file for seed values that must never appear
 * there (except as part of the generic contract/API code, which this allowlists by path).
 */

const CLIENT_SRC = join(__dirname, '../../src/client');

const FORBIDDEN_VALUES = [
  'B-24187',
  'B-24188',
  'B-24190',
  'B-24191',
  'SO-9931',
  'JET-04',
  'Teal 4C',
  'R. Karim',
  'Remazol',
  'Sodium Sulphate',
  'Soda Ash',
  'DYE-1180',
  '2026-0341',
];

// These files are allowed to mention seed-shaped strings only as part of code structure
// (e.g. this test file itself, or fixtures used only by tests) — none exist under src/client.
const ALLOWLIST: string[] = [];

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? listFiles(full) : [full];
  });
}

describe('no hard-coded scenario data in the UI', () => {
  const files = listFiles(CLIENT_SRC).filter(
    (f) => /\.(ts|tsx)$/.test(f) && !ALLOWLIST.some((a) => f.endsWith(a)),
  );

  it('found at least one client source file to scan', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('%s has no seeded batch/recipe/operator values', (file) => {
    const content = readFileSync(file, 'utf8');
    for (const value of FORBIDDEN_VALUES) {
      expect(content).not.toContain(value);
    }
  });
});
