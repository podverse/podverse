import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { getMembership403ModalProps } from './modalForMembership403';

const tMembership = Object.assign(
  (key: string, values?: Record<string, string | number>): string =>
    values === undefined ? key : `${key} ${JSON.stringify(values)}`,
  {
    rich: (): ReactNode => null,
  }
);

const membership = { isLoggedIn: true, tier: 'premium' as const };

describe('getMembership403ModalProps', () => {
  it('turns an Add by RSS feed-limit 403 into an Email Support dialog', () => {
    const modal = getMembership403ModalProps({
      error: {
        response: {
          status: 403,
          data: {
            code: 'add_by_rss_feed_limit_reached',
            i18nKey: 'membership.add_by_rss_feed_limit_reached',
            limit: 100,
          },
        },
      },
      contactEmail: 'support@example.com',
      featureContext: 'generic',
      membership,
      tMembership,
    });

    expect(modal?.title).toBe('gate.title_limit');
    expect(modal?.message).toBe(
      `add_by_rss_feed_limit_reached ${JSON.stringify({
        contactEmail: 'support@example.com',
        limit: 100,
      })}`
    );
    expect(modal?.actionLabel).toBe('gate.email_support');
    expect(modal?.actionHref).toBe('mailto:support@example.com');
  });

  it('returns null for a manual-refresh limit 403', () => {
    const modal = getMembership403ModalProps({
      error: {
        response: {
          status: 403,
          data: {
            code: 'manual_refresh_hourly_limit_reached',
            i18nKey: 'membership.manual_refresh_hourly_limit_reached',
            renewPath: '/membership/renew',
          },
        },
      },
      contactEmail: 'support@example.com',
      featureContext: 'manual_refresh',
      membership,
      tMembership,
    });

    expect(modal).toBeNull();
  });
});
