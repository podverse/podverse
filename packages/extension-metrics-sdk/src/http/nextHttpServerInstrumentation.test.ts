import http from 'node:http';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { initExtensions, shutdownExtensions } from '../init.js';
import { extensionRuntimeState, resetExtensionRuntimeState } from '../internalState.js';
import { registerNextHttpServerInstrumentation } from './nextHttpServerInstrumentation.js';

const recordMock = vi.fn();
const addMock = vi.fn();

vi.mock('../otel/meterProvider.js', () => ({
  createExtensionMeterProvider: vi.fn(() => ({
    getMeter: () => ({
      createHistogram: () => ({ record: recordMock }),
      createUpDownCounter: () => ({ add: addMock }),
    }),
    shutdown: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe('registerNextHttpServerInstrumentation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetExtensionRuntimeState();
  });

  afterEach(async () => {
    await shutdownExtensions();
  });

  it('records finished HTTP requests when extensions are enabled', async () => {
    initExtensions({
      metricsExtensionEnabled: true,
      otlpEndpoint: 'http://127.0.0.1:4318/v1/metrics',
      serviceName: 'podverse-web',
    });
    registerNextHttpServerInstrumentation();

    const server = http.createServer((_req, res) => {
      res.statusCode = 204;
      res.end();
    });

    await new Promise<void>((resolve, reject) => {
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        if (address === null || typeof address === 'string') {
          reject(new Error('expected server address object'));
          return;
        }

        http
          .get(
            `http://127.0.0.1:${address.port}/podcast/550e8400-e29b-41d4-a716-446655440000`,
            (res) => {
              res.resume();
              res.on('end', () => {
                server.close((closeErr) => {
                  if (closeErr !== undefined && closeErr !== null) {
                    reject(closeErr);
                    return;
                  }
                  resolve();
                });
              });
            }
          )
          .on('error', reject);
      });
    });

    expect(recordMock).toHaveBeenCalledWith(
      expect.any(Number),
      expect.objectContaining({
        'http.request.method': 'GET',
        'http.route': '/podcast/:id',
        'http.response.status_code': '204',
      })
    );
    expect(extensionRuntimeState.enabled).toBe(true);
  });
});
