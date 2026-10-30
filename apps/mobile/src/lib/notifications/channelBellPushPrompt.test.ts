import { describe, expect, it, vi } from 'vitest';

import type { DevicePushState } from '@podverse/helpers/notificationPush';

import { promptPushFromChannelBellIfAllowed } from './channelBellPushPrompt';

const cases: Array<{
  callsEnablePush: boolean;
  devicePushState: DevicePushState;
  name: string;
  signInPushPromptShown: boolean;
}> = [
  {
    callsEnablePush: true,
    devicePushState: 'can_request',
    name: 'asks once when this device can still be asked and the sign-in dialog has not been shown',
    signInPushPromptShown: false,
  },
  {
    callsEnablePush: false,
    devicePushState: 'can_request',
    name: 'does not ask when the sign-in dialog has been shown',
    signInPushPromptShown: true,
  },
  {
    callsEnablePush: false,
    devicePushState: 'enabled',
    name: 'does not ask when push is already enabled',
    signInPushPromptShown: false,
  },
  {
    callsEnablePush: false,
    devicePushState: 'blocked',
    name: 'does not ask when push is blocked',
    signInPushPromptShown: false,
  },
  {
    callsEnablePush: false,
    devicePushState: 'unsupported',
    name: 'does not ask when push is unsupported',
    signInPushPromptShown: false,
  },
];

describe('promptPushFromChannelBellIfAllowed', () => {
  it.each(cases)('$name', async ({ callsEnablePush, devicePushState, signInPushPromptShown }) => {
    const enablePush = vi.fn(async () => undefined);
    const asked = await promptPushFromChannelBellIfAllowed({
      enablePush,
      readDevicePushState: async () => devicePushState,
      readPromptShown: async () => signInPushPromptShown,
    });

    expect(asked).toBe(callsEnablePush);
    expect(enablePush).toHaveBeenCalledTimes(callsEnablePush ? 1 : 0);
  });
});
