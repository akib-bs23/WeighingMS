import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/server/database/schema/index.ts',
  out: './src/server/database/migrations',
});
