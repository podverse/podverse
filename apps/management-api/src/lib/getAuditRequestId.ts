import type { Request } from 'express';

import { getActiveTraceId } from '@podverse/observability';

export const getAuditRequestId = (req: Request): string => {
  const traceId = getActiveTraceId();
  if (traceId !== undefined) {
    return traceId;
  }

  const xRequestId = req.headers['x-request-id'];
  if (typeof xRequestId === 'string' && xRequestId.length > 0) {
    return xRequestId;
  }

  if ('id' in req) {
    const candidate = Reflect.get(req, 'id');
    if (typeof candidate === 'string' && candidate.length > 0) {
      return candidate;
    }
  }

  return 'unknown';
};
