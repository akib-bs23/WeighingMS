import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Logger, type Provider } from '@nestjs/common';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';

export const DATABASE = Symbol('DATABASE');
export type Db = BetterSQLite3Database<typeof schema>;

export const DEFAULT_DB_PATH = 'data/weighingms.db';
const MIGRATIONS_FOLDER = resolve('src/server/database/migrations');

/** Opens SQLite (file in dev, `:memory:` in tests via WEIGHINGMS_DB) and applies migrations. */
export function openDatabase(path: string): Db {
  if (path !== ':memory:') mkdirSync(dirname(resolve(path)), { recursive: true });
  const sqlite = new Database(path);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  new Logger('Database').log(`SQLite ready at ${path}`);
  return db;
}

export const databaseProvider: Provider = {
  provide: DATABASE,
  useFactory: (): Db => openDatabase(process.env.WEIGHINGMS_DB ?? DEFAULT_DB_PATH),
};
