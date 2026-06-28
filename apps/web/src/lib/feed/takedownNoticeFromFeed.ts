import type { DTOFeed } from '@podverse/helpers';
import { primaryBlockReasonForUi } from '@podverse/helpers';

export type LegalNoticeTranslationKeys = {
  policyKey: 'spam_policy' | 'archive_policy' | 'takedown_policy';
  explanationKey:
    'spam_policy_explanation' | 'archive_policy_explanation' | 'takedown_policy_explanation';
};

/**
 * `/takedown-notice` should send users back to the Podcast Index feed page when the feed is in a
 * normal state (lifecycle `active`, policy open, no primary block reason).
 */
export function shouldRedirectFromTakedownNoticePage(feed: DTOFeed | null): boolean {
  if (!feed) {
    return true;
  }

  const lifecycle = feed.feed_lifecycle_state?.feed_lifecycle_state_type?.state_key ?? null;
  const policy = feed.feed_policy;

  if (lifecycle === 'pending_archive' || lifecycle === 'archived' || lifecycle === 'takedown') {
    return false;
  }

  const lifecycleOpen = lifecycle === null || lifecycle === '' || lifecycle === 'active';
  if (!lifecycleOpen) {
    return false;
  }

  const reasonUi = primaryBlockReasonForUi(policy?.primary_block_reason ?? null);
  if (reasonUi !== null) {
    return false;
  }

  if (
    policy?.add_allowed === false ||
    policy?.public_visible === false ||
    policy?.parse_allowed === false
  ) {
    return false;
  }

  return true;
}

/** Maps lifecycle + `feed_policy.primary_block_reason` to existing `legal.*` translation keys. */
export function resolveLegalNoticeTranslationKeys(feed: DTOFeed): LegalNoticeTranslationKeys {
  const lifecycle = feed.feed_lifecycle_state?.feed_lifecycle_state_type?.state_key ?? null;
  const reasonUi = primaryBlockReasonForUi(feed.feed_policy?.primary_block_reason ?? null);

  if (lifecycle === 'pending_archive' || lifecycle === 'archived') {
    return {
      policyKey: 'archive_policy',
      explanationKey: 'archive_policy_explanation',
    };
  }

  if (lifecycle === 'takedown' || reasonUi === 'takedown_active') {
    return {
      policyKey: 'takedown_policy',
      explanationKey: 'takedown_policy_explanation',
    };
  }

  if (reasonUi === 'spam_detected') {
    return {
      policyKey: 'spam_policy',
      explanationKey: 'spam_policy_explanation',
    };
  }

  if (reasonUi === 'oversized_detected') {
    return {
      policyKey: 'spam_policy',
      explanationKey: 'spam_policy_explanation',
    };
  }

  if (reasonUi === 'manual_block') {
    return {
      policyKey: 'takedown_policy',
      explanationKey: 'takedown_policy_explanation',
    };
  }

  return {
    policyKey: 'takedown_policy',
    explanationKey: 'takedown_policy_explanation',
  };
}
