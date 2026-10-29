import type {
  DevicePushState,
  NotificationPushPreferenceRow,
} from '@podverse/helpers/notificationPush';
import { shouldOfferSignInPushPrompt } from '@podverse/helpers/notificationPush';

export type SignInPushPromptReads = {
  readAccountHasPushDevice: () => Promise<boolean>;
  readDevicePushState: () => Promise<DevicePushState>;
  readPreferences: () => Promise<readonly NotificationPushPreferenceRow[]>;
  readPromptShown: () => Promise<boolean>;
};

/**
 * Whether to present the one-time push dialog after a sign-in on this device. The local reads
 * come first and settle most sign-ins without a request.
 */
export const shouldPresentSignInPushPrompt = async (
  reads: SignInPushPromptReads
): Promise<boolean> => {
  const [signInPushPromptShown, devicePushState] = await Promise.all([
    reads.readPromptShown(),
    reads.readDevicePushState(),
  ]);
  if (signInPushPromptShown || devicePushState !== 'can_request') {
    return false;
  }
  const [preferences, accountHasPushDevice] = await Promise.all([
    reads.readPreferences(),
    reads.readAccountHasPushDevice(),
  ]);
  return shouldOfferSignInPushPrompt({
    accountHasPushDevice,
    devicePushState,
    preferences,
    signInPushPromptShown,
  });
};
