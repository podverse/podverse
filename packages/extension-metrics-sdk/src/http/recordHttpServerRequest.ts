import type { Histogram, Meter, UpDownCounter } from '@opentelemetry/api';

import {
  HTTP_METHOD,
  HTTP_ROUTE,
  HTTP_STATUS_CODE,
  INSTRUMENT_HTTP_SERVER_ACTIVE_REQUESTS,
  INSTRUMENT_HTTP_SERVER_DURATION,
} from '../otel/attributes.js';
import { normalizePathForMetricLabel } from './normalizePathForMetricLabel.js';

export type HttpMetricInstruments = {
  durationHistogram: Histogram;
  activeRequests: UpDownCounter;
};

export const createHttpMetricInstruments = (meter: Meter): HttpMetricInstruments => {
  return {
    durationHistogram: meter.createHistogram(INSTRUMENT_HTTP_SERVER_DURATION, {
      description: 'Duration of HTTP server requests',
      unit: 's',
    }),
    activeRequests: meter.createUpDownCounter(INSTRUMENT_HTTP_SERVER_ACTIVE_REQUESTS, {
      description: 'Number of active HTTP server requests',
    }),
  };
};

export const recordHttpServerRequest = (
  instruments: HttpMetricInstruments,
  method: string,
  routeOrPathname: string,
  statusCode: number,
  durationSeconds: number
): void => {
  const route = normalizePathForMetricLabel(routeOrPathname);
  const attributes = {
    [HTTP_METHOD]: method,
    [HTTP_ROUTE]: route,
    [HTTP_STATUS_CODE]: String(statusCode),
  };
  instruments.durationHistogram.record(durationSeconds, attributes);
};

export const incrementActiveHttpRequests = (
  instruments: HttpMetricInstruments,
  method: string
): void => {
  instruments.activeRequests.add(1, { [HTTP_METHOD]: method });
};

export const decrementActiveHttpRequests = (
  instruments: HttpMetricInstruments,
  method: string
): void => {
  instruments.activeRequests.add(-1, { [HTTP_METHOD]: method });
};
