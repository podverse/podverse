import { describe, expect, it } from 'vitest';

import type { ErrorLogDeviceSnapshot } from './errorLogDeviceContext';
import {
  androidDeviceType,
  errorLogDeviceFields,
  iosDeviceType,
  joinDeviceModel,
} from './errorLogDeviceContext';

const snapshot = (overrides: Partial<ErrorLogDeviceSnapshot> = {}): ErrorLogDeviceSnapshot => ({
  androidApiLevel: null,
  appBuild: '42',
  appLocale: 'en-US',
  appVersion: '5.5.3',
  deviceLocale: 'en-US',
  deviceType: 'phone',
  fontScale: 1,
  model: null,
  osName: 'iOS',
  osVersion: '26.5',
  runtime: 'debug',
  screenHeight: 852,
  screenScale: 3,
  screenWidth: 393,
  ...overrides,
});

describe('errorLogDeviceFields', () => {
  it('records the OS, device type, and build a support report can use', () => {
    expect(errorLogDeviceFields(snapshot()).map(({ key, value }) => `${key}: ${value}`)).toEqual([
      'os: iOS 26.5',
      'device_type: phone',
      'app_version: 5.5.3',
      'app_build: 42',
      'runtime: debug',
      'locale: en-US',
      'screen: 393×852 @3x',
    ]);
  });

  it('adds the Android API level and model, and notes when the app language differs', () => {
    const fields = errorLogDeviceFields(
      snapshot({
        androidApiLevel: 33,
        appLocale: 'es',
        deviceLocale: 'es-MX',
        deviceType: 'phone',
        fontScale: 1.35,
        model: 'Google Pixel 6 Pro',
        osName: 'Android',
        osVersion: '13',
        screenScale: 2.625,
      })
    );
    expect(fields.find((field) => field.key === 'os')?.value).toBe('Android 13 (API 33)');
    expect(fields.find((field) => field.key === 'model')?.value).toBe('Google Pixel 6 Pro');
    expect(fields.find((field) => field.key === 'locale')?.value).toBe('es-MX (app es)');
    expect(fields.find((field) => field.key === 'screen')?.value).toBe(
      '393×852 @2.63x · font 1.35'
    );
  });

  it('omits a missing model and build', () => {
    const keys = errorLogDeviceFields(snapshot({ appBuild: null, model: null })).map(
      (field) => field.key
    );
    expect(keys).not.toContain('model');
    expect(keys).not.toContain('app_build');
  });
});

describe('device type and model', () => {
  it('maps an iOS idiom onto a device type', () => {
    expect(iosDeviceType('pad')).toBe('tablet');
    expect(iosDeviceType('phone')).toBe('phone');
    expect(iosDeviceType('carplay')).toBe('car');
  });

  it('treats a wide Android handset mode as a tablet', () => {
    expect(androidDeviceType('normal', 800, 1280)).toBe('tablet');
    expect(androidDeviceType('normal', 393, 852)).toBe('phone');
    expect(androidDeviceType('tv', 1920, 1080)).toBe('tv');
  });

  it('does not repeat the manufacturer when the model already starts with it', () => {
    expect(joinDeviceModel('Google', 'Pixel 6 Pro')).toBe('Google Pixel 6 Pro');
    expect(joinDeviceModel('samsung', 'samsung SM-G991B')).toBe('samsung SM-G991B');
    expect(joinDeviceModel('', '')).toBeNull();
  });
});
