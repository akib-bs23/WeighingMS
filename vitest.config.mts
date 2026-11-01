import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

// SWC emits the decorator metadata NestJS dependency injection relies on; scoped away from the
// client so its JSX is handled by the React plugin instead.
export default defineConfig({
  plugins: [
    swc.vite({
      tsconfigFile: './tsconfig.test.json',
      module: { type: 'es6' },
      exclude: [/tests\/client\//, /src\/client\//],
      jsc: {
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
      },
    }),
    react(),
  ],
  test: {
    globals: true,
    // Default environment is node (server/shared tests); client tests opt into jsdom
    // individually via a leading `// @vitest-environment jsdom` directive comment.
    environment: 'node',
    setupFiles: ['tests/client/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/server/**/*.ts', 'src/shared/**/*.ts', 'src/client/**/*.{ts,tsx}'],
      exclude: ['src/server/database/migrations/**', 'src/server/main.ts', 'src/client/main.tsx'],
    },
  },
});
