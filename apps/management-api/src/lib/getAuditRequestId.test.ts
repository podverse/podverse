import { context, trace } from '@opentelemetry/api';
import type { Request } from 'express';
import { afterEach, describe, expect, it } from 'vitest';

import { initObservability, shutdownObservability } from '@podverse/observability';

import { getAuditRequestId } from './getAuditRequestId.js';

const makeReq = (headers: Record<string, string | undefined> = {}): Request => {
  return {
    headers,
  } as Request;
};

describe('getAuditRequestId', () => {
  afterEach(async () => {
    await shutdownObservability();
  });

  it('prefers active trace id when observability is initialized', () => {
    initObservability({
      serviceName: 'podverse-management-api-test',
      tracesExport: 'none',
    });

    const tracer = trace.getTracer('test');
    const span = tracer.startSpan('audit-test');
    const activeContext = trace.setSpan(context.active(), span);

    let requestId = 'unset';
    context.with(activeContext, () => {
      requestId = getAuditRequestId(makeReq({ 'x-request-id': 'header-id' }));
    });
    span.end();

    expect(requestId).toMatch(/^[0-9a-f]{32}$/);
  });

  it('falls back to x-request-id when no active trace', () => {
    expect(getAuditRequestId(makeReq({ 'x-request-id': 'header-id' }))).toBe('header-id');
  });

  it('falls back to unknown when no trace or header', () => {
    expect(getAuditRequestId(makeReq())).toBe('unknown');
  });
});
