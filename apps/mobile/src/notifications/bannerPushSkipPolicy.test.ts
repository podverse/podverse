import { describe, expect, it } from 'vitest';

import { NotificationCategoryEnum } from '@podverse/helpers';

import { shouldSkipBannerForPush } from './bannerPushSkipPolicy';

describe('shouldSkipBannerForPush', () => {
  it('skips when that category has push on and this device can deliver', () => {
    expect(
      shouldSkipBannerForPush({
        category: NotificationCategoryEnum.NewContent,
        devicePushState: 'enabled',
        pushEnabledByCategory: {
          [NotificationCategoryEnum.NewContent]: true,
        },
      })
    ).toBe(true);
  });

  it('shows the banner when push is on for the category but this device cannot deliver', () => {
    expect(
      shouldSkipBannerForPush({
        category: NotificationCategoryEnum.NewContent,
        devicePushState: 'blocked',
        pushEnabledByCategory: {
          [NotificationCategoryEnum.NewContent]: true,
        },
      })
    ).toBe(false);
  });

  it('shows the banner when that category has push off', () => {
    expect(
      shouldSkipBannerForPush({
        category: NotificationCategoryEnum.NewContent,
        devicePushState: 'enabled',
        pushEnabledByCategory: {
          [NotificationCategoryEnum.NewContent]: false,
        },
      })
    ).toBe(false);
  });

  it('shows a banner for a category whose push is off while another category has push on', () => {
    expect(
      shouldSkipBannerForPush({
        category: NotificationCategoryEnum.Livestream,
        devicePushState: 'enabled',
        pushEnabledByCategory: {
          [NotificationCategoryEnum.NewContent]: true,
          [NotificationCategoryEnum.Livestream]: false,
        },
      })
    ).toBe(false);
  });

  it('shows the banner while preferences have not loaded', () => {
    expect(
      shouldSkipBannerForPush({
        category: NotificationCategoryEnum.NewContent,
        devicePushState: 'enabled',
        pushEnabledByCategory: null,
      })
    ).toBe(false);
  });

  it('shows the banner while device push state has not been read', () => {
    expect(
      shouldSkipBannerForPush({
        category: NotificationCategoryEnum.NewContent,
        devicePushState: null,
        pushEnabledByCategory: {
          [NotificationCategoryEnum.NewContent]: true,
        },
      })
    ).toBe(false);
  });
});
