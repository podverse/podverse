import { isMobileE2eFromEnv } from '../../config/env';

/**
 * More's E2E section (Smoke at minimum) is on in local Metro and E2E builds. Release builds omit
 * the section. Playback harness rows still require `EXPO_PUBLIC_MOBILE_E2E=1`.
 */
export function isMobileE2eHarnessEnabled(): boolean {
  return __DEV__ || isMobileE2eFromEnv();
}
