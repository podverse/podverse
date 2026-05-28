import { context, trace } from '@opentelemetry/api';
import { afterEach, describe, expect, it } from 'vitest';

import { initObservability, shutdownObservability } from '@podverse/observability';

import {
  attachMqTraceContext,
  getMqTraceContextFromMessage,
  withMqConsumerSpan,
} from './traceEnvelope.js';

describe('traceEnvelope', () => {
  afterEach(async () => {
    await shutdownObservability();
  });

  it('attachMqTraceContext adds traceparent when a span is active', () => {
    initObservability({
      serviceName: 'podverse-mq-test',
      tracesExport: 'none',
    });

    const tracer = trace.getTracer('test');
    const span = tracer.startSpan('publish');
    let attached: Record<string, unknown> = {};
    context.with(trace.setSpan(context.active(), span), () => {
      attached = attachMqTraceContext({
        accountId: 1,
        feedUrl: 'https://example.com/feed.xml',
        requestId: 'rss-request-1',
      });
    });
    span.end();

    expect(attached.requestId).toBe('rss-request-1');
    expect(getMqTraceContextFromMessage(attached)?.traceparent).toMatch(
      /^00-[0-9a-f]{32}-[0-9a-f]{16}-0[1-9a-f]$/
    );
  });

  it('withMqConsumerSpan links consumer span to publisher trace context', async () => {
    initObservability({
      serviceName: 'podverse-mq-test',
      tracesExport: 'none',
    });

    const tracer = trace.getTracer('test');
    const publisherSpan = tracer.startSpan('publish');
    let publishedMessage: Record<string, unknown> = {};
    context.with(trace.setSpan(context.active(), publisherSpan), () => {
      publishedMessage = attachMqTraceContext({
        accountId: 1,
        feedUrl: 'https://example.com/feed.xml',
        requestId: 'rss-request-1',
      });
    });
    publisherSpan.end();

    let consumerTraceId: string | undefined;
    await withMqConsumerSpan('mq add-by-rss-on-demand', publishedMessage, async () => {
      consumerTraceId = trace.getSpan(context.active())?.spanContext().traceId;
    });

    const publisherTraceId =
      getMqTraceContextFromMessage(publishedMessage)?.traceparent.split('-')[1];
    expect(consumerTraceId).toBe(publisherTraceId);
  });
});
