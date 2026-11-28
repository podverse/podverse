import Constants from 'expo-constants';

import { getPublicClientConfigSnapshot } from '../config/publicClientConfig';

/**
 * Name interpolated into `{brand_name}` strings. Uses the public client config brand when
 * that value is non-empty, then the Expo config name, then `Podverse Next`.
 */
export const mobileBrandName = (): string => {
  const apiBrand = getPublicClientConfigSnapshot()?.brandName;
  if (apiBrand !== undefined && apiBrand !== null && apiBrand.length > 0) {
    return apiBrand;
  }
  const name = Constants.expoConfig?.name;
  if (typeof name === 'string') {
    const trimmed = name.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return 'Podverse Next';
};
