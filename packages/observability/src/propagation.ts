import type { Context } from '@opentelemetry/api';
import { context, propagation } from '@opentelemetry/api';

export type TraceContextCarrier = Record<string, string>;

export const injectTraceContext = (carrier: TraceContextCarrier): void => {
  propagation.inject(context.active(), carrier);
};

export const extractTraceContext = (carrier: TraceContextCarrier): Context => {
  return propagation.extract(context.active(), carrier);
};
