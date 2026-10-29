import { describe, expect, it } from 'vitest';

import type { DevicePushState } from '@podverse/helpers/notificationPush';

import type { DevicePushReading } from './devicePushState';
import { resolveDevicePushState } from './devicePushState';

const cases: Array<{
  expected: DevicePushState;
  name: string;
  reading: DevicePushReading;
}> = [
  {
    expected: 'enabled',
    name: 'reads enabled when Unified Push is registered on an FCM build without permission',
    reading: {
      fcmPermission: { canAskAgain: false, granted: false },
      pushProvider: 'fcm',
      unifiedPushRegistered: true,
    },
  },
  {
    expected: 'enabled',
    name: 'reads enabled when Unified Push is registered on a Unified Push build',
    reading: {
      fcmPermission: { canAskAgain: false, granted: false },
      pushProvider: 'unifiedpush',
      unifiedPushRegistered: true,
    },
  },
  {
    expected: 'unsupported',
    name: 'reads unsupported on a Unified Push build with no registration even when permission says granted',
    reading: {
      fcmPermission: { canAskAgain: true, granted: true },
      pushProvider: 'unifiedpush',
      unifiedPushRegistered: false,
    },
  },
  {
    expected: 'unsupported',
    name: 'reads unsupported on a no-push build with no registration even when permission says granted',
    reading: {
      fcmPermission: { canAskAgain: true, granted: true },
      pushProvider: 'none',
      unifiedPushRegistered: false,
    },
  },
  {
    expected: 'enabled',
    name: 'reads enabled when an FCM build has notification permission',
    reading: {
      fcmPermission: { canAskAgain: false, granted: true },
      pushProvider: 'fcm',
      unifiedPushRegistered: false,
    },
  },
  {
    expected: 'can_request',
    name: 'reads can_request when an FCM build can still show the system prompt',
    reading: {
      fcmPermission: { canAskAgain: true, granted: false },
      pushProvider: 'fcm',
      unifiedPushRegistered: false,
    },
  },
  {
    expected: 'blocked',
    name: 'reads blocked when an FCM build will not show the system prompt again',
    reading: {
      fcmPermission: { canAskAgain: false, granted: false },
      pushProvider: 'fcm',
      unifiedPushRegistered: false,
    },
  },
];

describe('resolveDevicePushState', () => {
  it.each(cases)('$name', ({ expected, reading }) => {
    expect(resolveDevicePushState(reading)).toBe(expected);
  });
});
