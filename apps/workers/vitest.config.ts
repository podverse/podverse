import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@workers': path.resolve(__dirname, 'src'),
      /* Tests must read current outbound source before dist is rebuilt */
      '@podverse/helpers-requests/outbound-http-policy': path.resolve(
        __dirname,
        '../../packages/helpers-requests/src/outboundHttpPolicy.ts'
      ),
      '@podverse/helpers-requests/outbound-requests': path.resolve(
        __dirname,
        '../../packages/helpers-requests/src/_requestOutbound.ts'
      ),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
