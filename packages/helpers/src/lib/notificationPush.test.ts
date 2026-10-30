import { describe, expect, it } from 'vitest';

import type { DevicePushState } from './notificationPush.js';
import {
  getSignInPushPromptShownStorageKey,
  hasAnyCategoryPushEnabled,
  shouldAutoPromptPushFromChannelBell,
  shouldOfferSignInPushPrompt,
  shouldShowDevicePushBanner,
} from './notificationPush.js';

const pushOn = { push_enabled: true };
const pushOff = { push_enabled: false };

describe('getSignInPushPromptShownStorageKey', () => {
  it('keys the shown flag by account', () => {
    expect(getSignInPushPromptShownStorageKey('abc123')).toBe(
      'notifications.sign_in_push_prompt_shown:abc123'
    );
  });
});

describe('hasAnyCategoryPushEnabled', () => {
  it.each([
    ['no rows', [], false],
    ['every row off', [pushOff, pushOff], false],
    ['one row on', [pushOff, pushOn], true],
  ])('%s', (_label, preferences, expected) => {
    expect(hasAnyCategoryPushEnabled(preferences)).toBe(expected);
  });
});

describe('shouldOfferSignInPushPrompt', () => {
  const ready: {
    accountHasPushDevice: boolean;
    devicePushState: DevicePushState;
    preferences: readonly { push_enabled: boolean }[];
    signInPushPromptShown: boolean;
  } = {
    accountHasPushDevice: true,
    devicePushState: 'can_request',
    preferences: [pushOn],
    signInPushPromptShown: false,
  };

  it('offers when not shown, can_request, a push device, and a category with Push on', () => {
    expect(shouldOfferSignInPushPrompt(ready)).toBe(true);
  });

  const closed: Array<[string, typeof ready]> = [
    ['the dialog was already shown', { ...ready, signInPushPromptShown: true }],
    ['the account has no push device', { ...ready, accountHasPushDevice: false }],
    ['no category has Push on', { ...ready, preferences: [] }],
    ['the device is enabled', { ...ready, devicePushState: 'enabled' }],
    ['the device is blocked', { ...ready, devicePushState: 'blocked' }],
    ['push is unsupported', { ...ready, devicePushState: 'unsupported' }],
  ];

  it.each(closed)('stays closed when %s', (_label, params) => {
    expect(shouldOfferSignInPushPrompt(params)).toBe(false);
  });
});

describe('shouldShowDevicePushBanner', () => {
  const withPush = {
    accountHasPushDevice: true,
    preferences: [pushOn],
  };

  const visibleStates: Array<'can_request' | 'blocked'> = ['can_request', 'blocked'];

  it.each(visibleStates)(
    'shows for %s when the account has a push device and a category has Push on',
    (devicePushState) => {
      expect(shouldShowDevicePushBanner({ ...withPush, devicePushState })).toBe(true);
    }
  );

  const hidden: Array<
    [
      string,
      {
        accountHasPushDevice: boolean;
        devicePushState: DevicePushState;
        preferences: readonly { push_enabled: boolean }[];
      },
    ]
  > = [
    [
      'enabled',
      {
        accountHasPushDevice: true,
        devicePushState: 'enabled',
        preferences: [pushOn],
      },
    ],
    [
      'unsupported',
      {
        accountHasPushDevice: true,
        devicePushState: 'unsupported',
        preferences: [pushOn],
      },
    ],
    [
      'can_request with no push row',
      {
        accountHasPushDevice: true,
        devicePushState: 'can_request',
        preferences: [],
      },
    ],
    [
      'can_request with no registered push device',
      {
        accountHasPushDevice: false,
        devicePushState: 'can_request',
        preferences: [pushOn],
      },
    ],
  ];

  it.each(hidden)('hides for %s', (_label, params) => {
    expect(shouldShowDevicePushBanner(params)).toBe(false);
  });
});

describe('shouldAutoPromptPushFromChannelBell', () => {
  it('prompts while this device can be asked and the sign-in dialog has not been shown', () => {
    expect(
      shouldAutoPromptPushFromChannelBell({
        devicePushState: 'can_request',
        signInPushPromptShown: false,
      })
    ).toBe(true);
  });

  const closed: Array<[string, DevicePushState, boolean]> = [
    ['the sign-in dialog was shown', 'can_request', true],
    ['the device is enabled', 'enabled', false],
    ['the device is blocked', 'blocked', false],
    ['push is unsupported', 'unsupported', false],
  ];

  it.each(closed)('stays closed when %s', (_label, devicePushState, signInPushPromptShown) => {
    expect(shouldAutoPromptPushFromChannelBell({ devicePushState, signInPushPromptShown })).toBe(
      false
    );
  });
});
