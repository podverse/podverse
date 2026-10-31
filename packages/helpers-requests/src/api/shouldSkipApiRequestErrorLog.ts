import { skipApiRequestErrorLogForAccountNotFound } from './skipApiRequestErrorLogForAccountNotFound.js';
import { skipApiRequestErrorLogForDirectoryChannelGone } from './skipApiRequestErrorLogForDirectoryChannelGone.js';
import { skipApiRequestErrorLogForFeedContentNotFound } from './skipApiRequestErrorLogForFeedContentNotFound.js';
import { skipApiRequestErrorLogForMembershipGate } from './skipApiRequestErrorLogForMembershipGate.js';
import { skipApiRequestErrorLogForMembershipPricing } from './skipApiRequestErrorLogForMembershipPricing.js';
import { skipApiRequestErrorLogForMobileRefresh } from './skipApiRequestErrorLogForMobileRefresh.js';
import { skipApiRequestErrorLogForTermsAcceptance } from './skipApiRequestErrorLogForTermsAcceptance.js';

export function shouldSkipApiRequestErrorLog(
  errorInfo: { status?: number; responseData?: unknown },
  requestPath: string
): boolean {
  return (
    skipApiRequestErrorLogForMembershipGate(errorInfo) ||
    skipApiRequestErrorLogForTermsAcceptance(errorInfo) ||
    skipApiRequestErrorLogForFeedContentNotFound(errorInfo, requestPath) ||
    skipApiRequestErrorLogForDirectoryChannelGone(errorInfo, requestPath) ||
    skipApiRequestErrorLogForAccountNotFound(errorInfo, requestPath) ||
    skipApiRequestErrorLogForMembershipPricing(errorInfo, requestPath) ||
    skipApiRequestErrorLogForMobileRefresh(errorInfo, requestPath)
  );
}
