import { Platform } from 'react-native';

import { isMobileE2eFromEnv } from '../../config/env';

const TEST_ASSETS_PORT = '2111';

/**
 * Seed / API fixture enclosure URLs use `http://localhost:2111/...` (web parity).
 * Under EXPO_PUBLIC_MOBILE_E2E=1, rewrite loopback host so device networking works:
 * - Android emulator: `10.0.2.2` (host loopback)
 * - iOS simulator: `127.0.0.1` (AVPlayer often prefers IPv4; Node `localhost` bind
 *   is frequently IPv6-only `[::1]`, which mobile E2E avoids via BIND_ADDRESS=0.0.0.0)
 */
export function resolveE2eMediaUrl(url: string): string {
  if (!isMobileE2eFromEnv()) {
    return url;
  }

  try {
    const parsed = new URL(url);
    const isLoopbackHost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    const port = parsed.port === '' ? (parsed.protocol === 'https:' ? '443' : '80') : parsed.port;
    if (!isLoopbackHost || port !== TEST_ASSETS_PORT) {
      return url;
    }

    parsed.hostname = Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';
    return parsed.toString();
  } catch {
    return url;
  }
}
