import type { ReactNode } from 'react';

import {
  accessDenialReasonFromGate,
  membershipDenialReason,
  parseMembershipGateError,
} from '@podverse/helpers-requests';

import type { ModalMessage } from '../../contexts/Modals';

export type Membership403FeatureContext = 'directory_add_by_rss' | 'manual_refresh' | 'generic';

type RichTagFn = (chunks: ReactNode) => ReactNode;

type MembershipTranslator = {
  (key: string): string;
  rich: (key: string, values: Record<string, string | number | Date | RichTagFn>) => ReactNode;
};

export function getMembership403ModalProps(params: {
  error: unknown;
  contactEmail: string;
  featureContext: Membership403FeatureContext;
  tMembership: MembershipTranslator;
}): ModalMessage | null {
  const payload = parseMembershipGateError(params.error);
  if (payload === null) {
    return null;
  }

  const { message: apiMessage, renewPath } = payload;
  const { contactEmail, featureContext, tMembership } = params;

  // Branch on the shared denial vocabulary so a server 403 and a client-side tier check describe
  // themselves the same way. `needs_account` cannot arise here: a 403 means the request carried
  // credentials, and logged-out callers are stopped by their own login guard before the request.
  const reason = accessDenialReasonFromGate(membershipDenialReason(payload.i18nKey));

  if (reason === 'membership_expired') {
    return {
      title: null,
      message: apiMessage ?? tMembership('membership_expired'),
      messageNode: null,
      actionLabel:
        renewPath !== undefined && renewPath !== '' ? tMembership('renew_membership') : null,
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
      actionLabel: tMembership('get_premium'),
      actionHref: '/membership',
    };
  }

  // `limit_reached` has no modal — quota denials fall through to the caller's own error handling.
  return null;
}
