import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@parser': path.resolve(__dirname, 'src'),
      /* Tests must read current source exports before dist is rebuilt */
      '@podverse/helpers-requests': path.resolve(__dirname, '../helpers-requests/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
