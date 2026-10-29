import type { DevicePushState } from '@podverse/helpers/notificationPush';
import { shouldAutoPromptPushFromChannelBell } from '@podverse/helpers/notificationPush';

export type ChannelBellPushPromptDeps = {
  enablePush: () => Promise<unknown>;
  readDevicePushState: () => Promise<DevicePushState>;
  readPromptShown: () => Promise<boolean>;
};

/**
 * Before a channel's notifications turn on, shows the system push prompt while this device can
 * still ask and the sign-in push dialog has not been shown here. Returns whether it asked.
 */
export const promptPushFromChannelBellIfAllowed = async (
  deps: ChannelBellPushPromptDeps
): Promise<boolean> => {
  const [devicePushState, signInPushPromptShown] = await Promise.all([
    deps.readDevicePushState(),
    deps.readPromptShown(),
  ]);
  if (!shouldAutoPromptPushFromChannelBell({ devicePushState, signInPushPromptShown })) {
    return false;
  }
  await deps.enablePush();
  return true;
};
