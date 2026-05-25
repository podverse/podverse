import { context, trace } from '@opentelemetry/api';

import { observabilityRuntimeState } from './internalState.js';
import { toValidSpanId, toValidTraceId } from './spanContextIds.js';

export const getObservabilityServiceName = (): string | undefined => {
  const serviceName = observabilityRuntimeState.config?.serviceName;
  if (serviceName === undefined || serviceName.trim() === '') {
    return undefined;
  }
  return serviceName;
};

export const getActiveTraceId = (): string | undefined => {
  const traceId = trace.getSpan(context.active())?.spanContext()?.traceId;
  return toValidTraceId(traceId);
};

export const getActiveSpanId = (): string | undefined => {
  const spanId = trace.getSpan(context.active())?.spanContext()?.spanId;
  return toValidSpanId(spanId);
};
