import type { ReactNode } from 'react';

import type { ModalMessage } from '../../contexts/Modals';

export type Membership403FeatureContext = 'directory_add_by_rss' | 'manual_refresh';

const I18N_MEMBERSHIP_EXPIRED = 'membership.membership_expired';
const I18N_FEATURE_NOT_AVAILABLE = 'membership.feature_not_available_for_account_type';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readMembership403Payload(error: unknown): {
  i18nKey: string;
  message?: string;
  renewPath?: string;
} | null {
  if (!isRecord(error)) {
    return null;
  }
  const responseUnknown = error.response;
  if (!isRecord(responseUnknown)) {
    return null;
  }
  if (responseUnknown.status !== 403) {
    return null;
  }
  const dataUnknown = responseUnknown.data;
  if (!isRecord(dataUnknown)) {
    return null;
  }
  const i18nKeyUnknown = dataUnknown.i18nKey;
  if (typeof i18nKeyUnknown !== 'string') {
    return null;
  }
  const messageUnknown = dataUnknown.message;
  const message =
    typeof messageUnknown === 'string' && messageUnknown !== '' ? messageUnknown : undefined;
  const renewPathUnknown = dataUnknown.renewPath;
  const renewPath =
    typeof renewPathUnknown === 'string' && renewPathUnknown !== '' ? renewPathUnknown : undefined;
  return { i18nKey: i18nKeyUnknown, message, renewPath };
}

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
  const payload = readMembership403Payload(params.error);
  if (payload === null) {
    return null;
  }

  const { i18nKey, message: apiMessage, renewPath } = payload;
  const { contactEmail, featureContext, tMembership } = params;

  if (i18nKey === I18N_MEMBERSHIP_EXPIRED) {
    return {
      title: null,
      message: apiMessage ?? tMembership('membership_expired'),
      messageNode: null,
      actionLabel:
        renewPath !== undefined && renewPath !== '' ? tMembership('renew_membership') : null,
      actionHref: renewPath ?? null,
    };
  }

  if (i18nKey === I18N_FEATURE_NOT_AVAILABLE) {
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

  return null;
}
