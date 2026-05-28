import { isValidSpanId, isValidTraceId } from '@opentelemetry/api';

export const toValidTraceId = (traceId: string | undefined): string | undefined => {
  if (traceId === undefined || !isValidTraceId(traceId)) {
    return undefined;
  }
  return traceId;
};

export const toValidSpanId = (spanId: string | undefined): string | undefined => {
  if (spanId === undefined || !isValidSpanId(spanId)) {
    return undefined;
  }
  return spanId;
};
