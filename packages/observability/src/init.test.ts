import { context, trace } from '@opentelemetry/api';
import { afterEach, describe, expect, it } from 'vitest';

import { getObservabilityHttpMiddleware } from './http/expressMiddleware.js';
import { initObservability, shutdownObservability } from './init.js';
import { getActiveTraceId } from './requestContext.js';

describe('initObservability', () => {
  afterEach(async () => {
    await shutdownObservability();
  });

  it('creates active trace context for express middleware', async () => {
    initObservability({
      serviceName: 'podverse-test',
      tracesExport: 'none',
    });

    const middleware = getObservabilityHttpMiddleware();
    await new Promise<void>((resolve) => {
      const req = {
        method: 'GET',
        headers: {},
        path: '/health',
      };
      const res = {
        statusCode: 200,
        on: (event: 'finish', listener: () => void) => {
          if (event === 'finish') {
            listener();
          }
        },
        setHeader: () => undefined,
      };

      middleware(req, res, () => {
        expect(getActiveTraceId()).toBeDefined();
        resolve();
      });
    });
  });

  it('shutdown clears initialization state', async () => {
    initObservability({
      serviceName: 'podverse-test',
      tracesExport: 'none',
    });
    await shutdownObservability();
    expect(trace.getSpan(context.active())).toBeUndefined();
  });

  it('initializes otlp export config without throwing', async () => {
    initObservability({
      serviceName: 'podverse-test',
      tracesExport: 'otlp',
      otlpEndpoint: 'http://127.0.0.1:4318',
    });
    await shutdownObservability();
    expect(trace.getSpan(context.active())).toBeUndefined();
  });
});
