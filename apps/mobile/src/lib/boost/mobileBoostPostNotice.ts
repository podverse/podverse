import { getErrorResponseBodyCode, getErrorResponseBodyMessage } from '@podverse/helpers/error';
import {
  METABOOST_OWNER_TERMS_NOT_ACCEPTED_CURRENT_CODE,
  MetaboostCapabilityPreflightError,
  MetaboostOwnerTermsNotAcceptedPostError,
  MetaboostSenderBlockedPostError,
} from '@podverse/v4v-metaboost';

export type MobileBoostPostNotice =
  | { kind: 'capability_already_shown' }
  | { kind: 'owner_terms'; detail: string | null }
  | { kind: 'post_failed'; detail: string | null }
  | { kind: 'sender_blocked'; detail: string | null };

const detailOrNull = (detailMessage: string): string | null => {
  const trimmed = detailMessage.trim();
  if (trimmed === '') {
    return null;
  }
  return trimmed;
};

export function mobileBoostPostNotice(error: unknown): MobileBoostPostNotice {
  if (error instanceof MetaboostCapabilityPreflightError) {
    return { kind: 'capability_already_shown' };
  }
  if (error instanceof MetaboostSenderBlockedPostError) {
    return { kind: 'sender_blocked', detail: detailOrNull(error.detailMessage) };
  }
  if (error instanceof MetaboostOwnerTermsNotAcceptedPostError) {
    return { kind: 'owner_terms', detail: detailOrNull(error.detailMessage) };
  }

  const bodyMessage = getErrorResponseBodyMessage(error);
  if (bodyMessage !== undefined && bodyMessage.trim() !== '') {
    return { kind: 'post_failed', detail: bodyMessage };
  }
  if (getErrorResponseBodyCode(error) === METABOOST_OWNER_TERMS_NOT_ACCEPTED_CURRENT_CODE) {
    return { kind: 'owner_terms', detail: null };
  }
  return { kind: 'post_failed', detail: null };
}
