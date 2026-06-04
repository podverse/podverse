import { skipApiRequestErrorLogForAccountNotFound } from './skipApiRequestErrorLogForAccountNotFound.js';
import { skipApiRequestErrorLogForFeedContentNotFound } from './skipApiRequestErrorLogForFeedContentNotFound.js';
import { skipApiRequestErrorLogForMembershipGate } from './skipApiRequestErrorLogForMembershipGate.js';

export function shouldSkipApiRequestErrorLog(
  errorInfo: { status?: number; responseData?: unknown },
  requestPath: string
): boolean {
  return (
    skipApiRequestErrorLogForMembershipGate(errorInfo) ||
    skipApiRequestErrorLogForFeedContentNotFound(errorInfo, requestPath) ||
    skipApiRequestErrorLogForAccountNotFound(errorInfo, requestPath)
  );
}
