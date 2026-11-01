import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Logger } from '@nestjs/common';
import { count } from 'drizzle-orm';
import { openDatabase } from '../../../src/server/database/database.provider';
import { orgatexBatches } from '../../../src/server/database/schema';

const close = (db: ReturnType<typeof openDatabase>): void => {
  (db.$client as { close(): void }).close();
};

describe('openDatabase', () => {
  let dir: string;

  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    dir = mkdtempSync(join(tmpdir(), 'weighingms-db-'));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(dir, { recursive: true, force: true });
  });

  it('creates missing folders for a file database and applies migrations', () => {
    const path = join(dir, 'nested', 'weighingms.db');
    const db = openDatabase(path);
    expect(existsSync(path)).toBe(true);
    expect(db.select({ n: count() }).from(orgatexBatches).get()?.n).toBe(0);
    close(db);
  });

  it('opens an in-memory database', () => {
    const db = openDatabase(':memory:');
    expect(db.select({ n: count() }).from(orgatexBatches).get()?.n).toBe(0);
    close(db);
  });
});
