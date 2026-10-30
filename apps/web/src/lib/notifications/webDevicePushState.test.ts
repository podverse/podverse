import { describe, expect, it } from 'vitest';

import type { DevicePushState } from '@podverse/helpers';

import { getWebDevicePushState } from './webDevicePushState';

type WebDevicePushStateParams = Parameters<typeof getWebDevicePushState>[0];

const availableBrowser: WebDevicePushStateParams = {
  accountUnifiedPushRegistered: false,
  notificationApiAvailable: true,
  permission: 'default',
  thisBrowserWebPushRegistered: false,
  vapidPublicKeyConfigured: true,
};

describe('getWebDevicePushState', () => {
  it.each<{
    expected: DevicePushState;
    label: string;
    overrides: Partial<WebDevicePushStateParams>;
  }>([
    {
      expected: 'unsupported',
      label: 'API unavailable',
      overrides: { notificationApiAvailable: false },
    },
    {
      expected: 'unsupported',
      label: 'no VAPID key',
      overrides: { vapidPublicKeyConfigured: false },
    },
    {
      expected: 'enabled',
      label: 'Unified Push registered with permission default',
      overrides: { accountUnifiedPushRegistered: true, permission: 'default' },
    },
    {
      expected: 'enabled',
      label: 'granted and registered',
      overrides: { permission: 'granted', thisBrowserWebPushRegistered: true },
    },
    {
      expected: 'can_request',
      label: 'granted and not registered',
      overrides: { permission: 'granted', thisBrowserWebPushRegistered: false },
    },
    {
      expected: 'can_request',
      label: 'default',
      overrides: { permission: 'default' },
    },
    {
      expected: 'blocked',
      label: 'denied',
      overrides: { permission: 'denied' },
    },
  ])('$label', ({ expected, overrides }) => {
    expect(getWebDevicePushState({ ...availableBrowser, ...overrides })).toBe(expected);
  });
});
