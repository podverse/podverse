import { describe, expect, it, vi } from 'vitest';

import type {
  DevicePushState,
  NotificationPushPreferenceRow,
} from '@podverse/helpers/notificationPush';

import { shouldPresentSignInPushPrompt } from './signInPushPrompt';

const buildReads = ({
  accountHasPushDevice = true,
  devicePushState = 'can_request',
  preferences = [{ push_enabled: true }],
  promptShown = false,
}: {
  accountHasPushDevice?: boolean;
  devicePushState?: DevicePushState;
  preferences?: NotificationPushPreferenceRow[];
  promptShown?: boolean;
} = {}) => ({
  readAccountHasPushDevice: vi.fn(async () => accountHasPushDevice),
  readDevicePushState: vi.fn(async () => devicePushState),
  readPreferences: vi.fn(async () => preferences),
  readPromptShown: vi.fn(async () => promptShown),
});

describe('shouldPresentSignInPushPrompt', () => {
  it('presents when not shown, the device can ask, the account has a device, and a category has push on', async () => {
    const reads = buildReads();

    await expect(shouldPresentSignInPushPrompt(reads)).resolves.toBe(true);
  });

  it('does not present once shown and makes no network read', async () => {
    const reads = buildReads({ promptShown: true });

    await expect(shouldPresentSignInPushPrompt(reads)).resolves.toBe(false);
    expect(reads.readPreferences).not.toHaveBeenCalled();
    expect(reads.readAccountHasPushDevice).not.toHaveBeenCalled();
  });

  it.each<DevicePushState>(['enabled', 'blocked', 'unsupported'])(
    'does not present when this device is %s and makes no network read',
    async (devicePushState) => {
      const reads = buildReads({ devicePushState });

      await expect(shouldPresentSignInPushPrompt(reads)).resolves.toBe(false);
      expect(reads.readPreferences).not.toHaveBeenCalled();
      expect(reads.readAccountHasPushDevice).not.toHaveBeenCalled();
    }
  );

  it.each([
    {
      accountHasPushDevice: false,
      name: 'the account has no push device',
      preferences: [{ push_enabled: true }],
    },
    {
      accountHasPushDevice: true,
      name: 'every category has push off',
      preferences: [{ push_enabled: false }, { push_enabled: false }],
    },
  ])('does not present when $name', async ({ accountHasPushDevice, preferences }) => {
    const reads = buildReads({ accountHasPushDevice, preferences });

    await expect(shouldPresentSignInPushPrompt(reads)).resolves.toBe(false);
  });

  it('rejects when the preferences read fails', async () => {
    const reads = buildReads();
    const failure = new Error('preferences unavailable');
    reads.readPreferences.mockRejectedValueOnce(failure);

    await expect(shouldPresentSignInPushPrompt(reads)).rejects.toBe(failure);
  });
});
