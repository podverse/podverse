import type { ReactNode } from 'react';

import type { MembershipState } from '@podverse/helpers';
import { membershipPurchaseAction, membershipPurchaseMessageKey } from '@podverse/helpers';
import {
  accessDenialReasonFromGate,
  membershipDenialReason,
  parseAddByRssFeedLimitRefusal,
  parseMembershipGateError,
} from '@podverse/helpers-requests';

import type { ModalMessage } from '../../contexts/Modals';

export type Membership403FeatureContext = 'directory_add_by_rss' | 'manual_refresh' | 'generic';

type RichTagFn = (chunks: ReactNode) => ReactNode;

type MembershipTranslator = {
  (key: string, values?: Record<string, string | number>): string;
  rich: (key: string, values: Record<string, string | number | Date | RichTagFn>) => ReactNode;
};

export function getMembership403ModalProps(params: {
  error: unknown;
  contactEmail: string;
  featureContext: Membership403FeatureContext;
  membership: Pick<MembershipState, 'isLoggedIn' | 'tier'>;
  tMembership: MembershipTranslator;
}): ModalMessage | null {
  const feedLimitRefusal = parseAddByRssFeedLimitRefusal(params.error);
  if (feedLimitRefusal !== null) {
    return {
      title: params.tMembership('gate.title_limit'),
      message: params.tMembership('add_by_rss_feed_limit_reached', {
        contactEmail: params.contactEmail,
        limit: feedLimitRefusal.limit,
      }),
      messageNode: null,
      actionLabel: params.tMembership('gate.email_support'),
      actionHref: `mailto:${params.contactEmail}`,
    };
  }

  const payload = parseMembershipGateError(params.error);
  if (payload === null) {
    return null;
  }

  const { message: apiMessage, renewPath } = payload;
  const { contactEmail, featureContext, membership, tMembership } = params;
  const purchaseLabel = tMembership(
    membershipPurchaseMessageKey(membershipPurchaseAction(membership))
  );

  // Branch on the shared denial vocabulary so a server 403 and a client-side tier check describe
  // themselves the same way. `needs_account` cannot arise here: a 403 means the request carried
  // credentials, and logged-out callers are stopped by their own login guard before the request.
  const reason = accessDenialReasonFromGate(membershipDenialReason(payload.i18nKey));

  if (reason === 'membership_expired') {
    return {
      title: null,
      message: apiMessage ?? tMembership('membership_expired'),
      messageNode: null,
      actionLabel: renewPath !== undefined && renewPath !== '' ? purchaseLabel : null,
      actionHref: renewPath ?? null,
    };
  }

  if (reason === 'needs_membership') {
    const messageNode: ReactNode | null =
      featureContext === 'directory_add_by_rss'
        ? tMembership.rich('directory_add_by_rss_trial_blocked', {
            contactEmail,
            mail: (chunks) => <a href={`mailto:${contactEmail}`}>{chunks}</a>,
          })
        : null;
    const message: string | null =
      featureContext === 'directory_add_by_rss'
        ? null
        : tMembership('feature_premium_only_explanation');

    return {
      title: tMembership('premium_required'),
      message,
      messageNode,
      actionLabel: purchaseLabel,
      actionHref: '/membership',
    };
  }

  // The remaining `limit_reached` denials (manual refresh, and an Add by RSS refusal without
  // `limit`) have no modal here.
  return null;
}
