import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@parser': path.resolve(__dirname, 'src'),
      /* Tests must read current source exports before dist is rebuilt */
      '@podverse/helpers-requests/outbound-http-policy': path.resolve(
        __dirname,
        '../helpers-requests/src/outboundHttpPolicy.ts'
      ),
      '@podverse/helpers-requests/outbound-requests': path.resolve(
        __dirname,
        '../helpers-requests/src/_requestOutbound.ts'
      ),
      '@podverse/helpers-requests': path.resolve(__dirname, '../helpers-requests/src/index.ts'),
      '@podverse/extension-metrics-sdk': path.resolve(
        __dirname,
        '../extension-metrics-sdk/src/index.ts'
      ),
      '@podverse/notifications': path.resolve(__dirname, '../notifications/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
