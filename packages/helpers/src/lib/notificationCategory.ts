export enum NotificationCategoryEnum {
  NewContent = 'new-content',
  Livestream = 'livestream',
  MembershipExpiry = 'membership-expiry',
  ProductUpdate = 'product-update',
  Maintenance = 'maintenance',
  TermsOfService = 'terms-of-service',
  General = 'general',
}

export const NOTIFICATION_CATEGORY_VALUES = Object.values(NotificationCategoryEnum);

export type NotificationCategoryValues = (typeof NOTIFICATION_CATEGORY_VALUES)[number];

export type NotificationCategoryPreferenceDefaults = {
  in_app_enabled: boolean;
  push_enabled: boolean;
};

export const DEFAULT_NOTIFICATION_CATEGORY_PREFERENCES = {
  [NotificationCategoryEnum.NewContent]: {
    in_app_enabled: true,
    push_enabled: true,
  },
  [NotificationCategoryEnum.Livestream]: {
    in_app_enabled: true,
    push_enabled: true,
  },
  [NotificationCategoryEnum.MembershipExpiry]: {
    in_app_enabled: true,
    push_enabled: true,
  },
  [NotificationCategoryEnum.ProductUpdate]: {
    in_app_enabled: true,
    push_enabled: false,
  },
  [NotificationCategoryEnum.Maintenance]: {
    in_app_enabled: true,
    push_enabled: false,
  },
  [NotificationCategoryEnum.TermsOfService]: {
    in_app_enabled: true,
    push_enabled: false,
  },
  [NotificationCategoryEnum.General]: {
    in_app_enabled: true,
    push_enabled: false,
  },
} satisfies Record<NotificationCategoryValues, NotificationCategoryPreferenceDefaults>;

export function getDefaultNotificationCategoryPreference(
  category: NotificationCategoryValues
): NotificationCategoryPreferenceDefaults {
  const defaults = DEFAULT_NOTIFICATION_CATEGORY_PREFERENCES[category];
  return {
    in_app_enabled: defaults.in_app_enabled,
    push_enabled: defaults.push_enabled,
  };
}
