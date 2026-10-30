import type { DTOAccountNotificationPreference } from '../dtos/account/accountNotificationPreference.js';

/**
 * Whether this device can receive push for the signed-in account. Each surface maps its own
 * platform reading to one of these.
 *
 * - `enabled`: permission is granted and this device is registered for the account.
 * - `can_request`: asking shows the platform permission prompt, or permission is already granted
 *   and only this device's registration is missing.
 * - `blocked`: the platform will not show its prompt again; the person changes it in browser or
 *   system settings.
 * - `unsupported`: this browser or build cannot receive push.
 */
export type DevicePushState = 'enabled' | 'can_request' | 'blocked' | 'unsupported';

export type NotificationPushPreferenceRow = Pick<DTOAccountNotificationPreference, 'push_enabled'>;

const SIGN_IN_PUSH_PROMPT_SHOWN_KEY_PREFIX = 'notifications.sign_in_push_prompt_shown:';

export const SIGN_IN_PUSH_PROMPT_SHOWN_VALUE = '1';

/**
 * Web `localStorage` and mobile AsyncStorage store the sign-in push dialog's shown flag under this
 * key, with `SIGN_IN_PUSH_PROMPT_SHOWN_VALUE` as the value.
 */
export const getSignInPushPromptShownStorageKey = (accountIdText: string): string => {
  return `${SIGN_IN_PUSH_PROMPT_SHOWN_KEY_PREFIX}${accountIdText}`;
};

/**
 * True when at least one category has Push on. Pass the rows from the notification preferences
 * GET; it seeds missing categories with their defaults, so a new account reads as push on for New
 * Content and Livestream.
 */
export const hasAnyCategoryPushEnabled = (
  preferences: readonly NotificationPushPreferenceRow[]
): boolean => {
  return preferences.some((preference) => preference.push_enabled === true);
};

/**
 * The one-time dialog right after signing in on this device. A registered push device on the
 * account separates push the person turned on from the defaults every account is seeded with.
 */
export const shouldOfferSignInPushPrompt = (params: {
  accountHasPushDevice: boolean;
  devicePushState: DevicePushState;
  preferences: readonly NotificationPushPreferenceRow[];
  signInPushPromptShown: boolean;
}): boolean => {
  return (
    !params.signInPushPromptShown &&
    params.devicePushState === 'can_request' &&
    params.accountHasPushDevice &&
    hasAnyCategoryPushEnabled(params.preferences)
  );
};

/**
 * The warning banner at the top of the notification settings screen. Same device requirement as
 * the sign-in dialog: a registered push device on the account, a category with Push on, and this
 * device has not allowed notifications (`can_request` or `blocked`).
 */
export const shouldShowDevicePushBanner = (params: {
  accountHasPushDevice: boolean;
  devicePushState: DevicePushState;
  preferences: readonly NotificationPushPreferenceRow[];
}): boolean => {
  const deviceHasNotAllowed =
    params.devicePushState === 'can_request' || params.devicePushState === 'blocked';
  return (
    params.accountHasPushDevice &&
    hasAnyCategoryPushEnabled(params.preferences) &&
    deviceHasNotAllowed
  );
};

/**
 * Whether turning on a channel's notifications may open the automatic enable-push prompt. After
 * the sign-in dialog has been shown on this device, the person turns push on from notification
 * settings instead.
 */
export const shouldAutoPromptPushFromChannelBell = (params: {
  devicePushState: DevicePushState;
  signInPushPromptShown: boolean;
}): boolean => {
  return params.devicePushState === 'can_request' && !params.signInPushPromptShown;
};
