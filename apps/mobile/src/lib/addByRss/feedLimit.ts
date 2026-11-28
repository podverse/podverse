import { requestWithMobileAuthRefreshIfSignedIn } from '../../auth/authRequestWithRefresh';
import { loadPublicClientConfig } from '../../config/publicClientConfig';
import type { MobileAuthRequestContext } from '../../data/repositories/types';

/**
 * The default reader reads `membership.maxAddByRSSFeeds` from the shared public client config
 * load. The account reader reads the signed-in account's own limit from the server. `null`
 * means that read did not answer with a non-negative integer.
 */

const readNonNegativeInteger = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    return null;
  }
  return value;
};

export async function fetchAddByRssDefaultFeedLimit(): Promise<number | null> {
  try {
    const config = await loadPublicClientConfig();
    if (config === null) {
      return null;
    }
    return readNonNegativeInteger(config.membership.maxAddByRSSFeeds);
  } catch {
    return null;
  }
}

export async function fetchAccountAddByRssFeedLimit(
  context: MobileAuthRequestContext
): Promise<number | null> {
  try {
    const response = await requestWithMobileAuthRefreshIfSignedIn(context, (api) =>
      api.reqAccountAddByRSSFeedLimitGet()
    );
    if (response === null) {
      return null;
    }
    return readNonNegativeInteger(response.data.maxAddByRSSFeeds);
  } catch {
    return null;
  }
}
