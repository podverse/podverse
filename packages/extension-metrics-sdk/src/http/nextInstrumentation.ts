import { extensionRuntimeState } from '../internalState.js';
import { normalizePathForMetricLabel } from './normalizePathForMetricLabel.js';
import { recordHttpServerRequest } from './recordHttpServerRequest.js';

/**
 * Record one HTTP request from Next.js server instrumentation (preferred over middleware).
 */
export const recordNextHttpServerRequest = (
  method: string,
  pathname: string,
  statusCode: number,
  durationMs: number
): void => {
  if (!extensionRuntimeState.enabled || extensionRuntimeState.httpInstruments === null) {
    return;
  }

  if (pathname.startsWith('/extensions/')) {
    return;
  }

  const durationSeconds = durationMs / 1000;
  recordHttpServerRequest(
    extensionRuntimeState.httpInstruments,
    method,
    normalizePathForMetricLabel(pathname),
    statusCode,
    durationSeconds
  );
};
