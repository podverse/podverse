import { SpanStatusCode, trace } from '@opentelemetry/api';

import { observabilityRuntimeState } from '../internalState.js';

const TRACER_NAME = 'podverse.observability.worker';

export async function withWorkerSpan<T>(spanName: string, fn: () => Promise<T>): Promise<T> {
  if (!observabilityRuntimeState.initialized) {
    return fn();
  }

  const tracer = trace.getTracer(TRACER_NAME);
  return tracer.startActiveSpan(spanName, async (span) => {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof Error) {
        span.recordException(error);
      }
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  });
}
