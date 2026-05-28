import { context } from '@opentelemetry/api';

import { extractTraceContext, injectTraceContext, withWorkerSpan } from '@podverse/observability';

import type { MQTraceContext } from '../types/mq.js';

export const getMqTraceContextFromMessage = (message: unknown): MQTraceContext | undefined => {
  if (typeof message !== 'object' || message === null) {
    return undefined;
  }

  const traceContext = Reflect.get(message, 'traceContext');
  if (typeof traceContext !== 'object' || traceContext === null) {
    return undefined;
  }

  const traceparent = Reflect.get(traceContext, 'traceparent');
  if (typeof traceparent !== 'string' || traceparent === '') {
    return undefined;
  }

  const tracestate = Reflect.get(traceContext, 'tracestate');
  return {
    traceparent,
    ...(typeof tracestate === 'string' && tracestate !== '' ? { tracestate } : {}),
  };
};

export const attachMqTraceContext = <T extends Record<string, unknown>>(message: T): T => {
  const carrier: Record<string, string> = {};
  injectTraceContext(carrier);

  if (carrier.traceparent === undefined || carrier.traceparent === '') {
    return message;
  }

  const traceContext: MQTraceContext = {
    traceparent: carrier.traceparent,
  };
  if (carrier.tracestate !== undefined && carrier.tracestate !== '') {
    traceContext.tracestate = carrier.tracestate;
  }

  return {
    ...message,
    traceContext,
  };
};

export async function withMqConsumerSpan<T>(
  spanName: string,
  message: unknown,
  fn: () => Promise<T>
): Promise<T> {
  const traceContext = getMqTraceContextFromMessage(message);
  if (traceContext === undefined) {
    return withWorkerSpan(spanName, fn);
  }

  const carrier: Record<string, string> = {
    traceparent: traceContext.traceparent,
  };
  if (traceContext.tracestate !== undefined) {
    carrier.tracestate = traceContext.tracestate;
  }

  const parentContext = extractTraceContext(carrier);
  return context.with(parentContext, () => withWorkerSpan(spanName, fn));
}
