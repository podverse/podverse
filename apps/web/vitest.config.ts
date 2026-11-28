import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      /* Tests must read current outbound source before dist is rebuilt */
      '@podverse/helpers-requests/outbound-http-policy': path.resolve(
        repoRoot,
        'packages/helpers-requests/src/outboundHttpPolicy.ts'
      ),
      '@podverse/helpers-requests/outbound-requests': path.resolve(
        repoRoot,
        'packages/helpers-requests/src/_requestOutbound.ts'
      ),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['./src/test/vitest-setup.ts'],
  },
});
