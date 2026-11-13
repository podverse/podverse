import { fetch } from 'expo/fetch';
import Constants from 'expo-constants';
import { setPartytimeLogLevel } from 'podverse-partytime/core';
import { Platform } from 'react-native';

import { sleep } from '@podverse/helpers';

import { MOBILE_CLIENT_VERSION_FALLBACK } from '../../auth/mobileClientHeaders';
import { isAddByRssInsecureCredentialsAllowedFromEnv } from '../../config/env';
import { isOfflineModeEnabled, OfflineModeEnabledError } from '../../prefs/offlineMode';
import { resolveE2eMediaUrl } from '../e2e/resolveE2eMediaUrl';
import { mobileBrandName } from '../mobileBrandName';
import type {
  AddByRssDeviceFetchDeps,
  AddByRssDeviceParseInput,
  AddByRssDeviceParseResult,
  AddByRssDeviceResource,
  AddByRssDeviceResourceInput,
} from './deviceParseEngine';
import {
  ADD_BY_RSS_DEVICE_FETCH_TIMEOUT_MS,
  buildAddByRssDeviceUserAgent,
  createAddByRssHostPacer,
  runAddByRssDeviceParse,
  runAddByRssDeviceResourceFetch,
} from './deviceParseEngine';

// A creator's malformed feed is not an app fault, and the parse result already carries the outcome.
setPartytimeLogLevel('silent');

const resolveParseVersion = (): string => {
  const version = Constants.expoConfig?.version;
  if (typeof version === 'string' && version.trim() !== '') {
    return version.trim();
  }
  return MOBILE_CLIENT_VERSION_FALLBACK;
};

const parseVersion = resolveParseVersion();

const userAgent = buildAddByRssDeviceUserAgent({
  appName: mobileBrandName(),
  appVersion: parseVersion,
  platform: Platform.OS,
});

const hostPacer = createAddByRssHostPacer({ now: Date.now, sleep });

/** Feed parses and the files feeds link share one host pacer, so their requests space together. */
const deviceFetchDeps = (): AddByRssDeviceFetchDeps => ({
  allowInsecureCredentials: isAddByRssInsecureCredentialsAllowedFromEnv(),
  fetch,
  pacer: hostPacer,
  rewriteUrl: resolveE2eMediaUrl,
  timeoutMs: ADD_BY_RSS_DEVICE_FETCH_TIMEOUT_MS,
  userAgent,
});

/**
 * Fetches and parses an Add by RSS feed from its host on this device. Throws
 * `OfflineModeEnabledError` while Offline Mode is on and rethrows the caller's abort; every other
 * problem is a `failed` result.
 */
export const parseAddByRssFeedOnDevice = async (
  input: AddByRssDeviceParseInput
): Promise<AddByRssDeviceParseResult> => {
  if (isOfflineModeEnabled()) {
    throw new OfflineModeEnabledError();
  }
  return runAddByRssDeviceParse(input, { ...deviceFetchDeps(), parseVersion });
};

/**
 * Fetches one file an Add by RSS feed links (chapters JSON, a transcript) from its host on this
 * device, with credentials only where the feed's credential scope allows on every hop. Returns
 * any HTTP status. Throws `OfflineModeEnabledError` while Offline Mode is on, and throws when the
 * host cannot be reached, the deadline passes, or the caller aborts.
 */
export const fetchAddByRssResourceOnDevice = async (
  input: AddByRssDeviceResourceInput
): Promise<AddByRssDeviceResource> => {
  if (isOfflineModeEnabled()) {
    throw new OfflineModeEnabledError();
  }
  return runAddByRssDeviceResourceFetch(input, deviceFetchDeps());
};
