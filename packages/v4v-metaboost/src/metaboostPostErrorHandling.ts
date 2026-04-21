import {
  getErrorResponseBodyCode,
  getErrorResponseBodyMessage,
  getErrorResponseStatus,
} from '@podverse/helpers';

import { MetaboostOwnerTermsNotAcceptedPostError } from './metaboostOwnerTermsNotAcceptedPostError.js';
import { MetaboostSenderBlockedPostError } from './metaboostSenderBlockedPostError.js';

export const METABOOST_OWNER_TERMS_NOT_ACCEPTED_CURRENT_CODE =
  'owner_terms_not_accepted_current' as const;

/**
 * Re-throws known MetaBoost ingest contract errors as typed errors.
 * Unknown errors are intentionally ignored by this helper and should be handled by caller.
 */
export const throwKnownMetaboostPostError = (error: unknown): void => {
  const status = getErrorResponseStatus(error);
  const code = getErrorResponseBodyCode(error);
  if (status !== 403 || code === undefined || code === null) {
    return;
  }
  const message = getErrorResponseBodyMessage(error);
  const detailMessage = message !== undefined && message.trim() !== '' ? message.trim() : '';

  if (code === 'sender_blocked') {
    throw new MetaboostSenderBlockedPostError(detailMessage);
  }
  if (code === METABOOST_OWNER_TERMS_NOT_ACCEPTED_CURRENT_CODE) {
    throw new MetaboostOwnerTermsNotAcceptedPostError(detailMessage);
  }
};
