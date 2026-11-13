import {
  requestWithMobileAuthRefreshIfSignedIn,
  requestWithoutMobileAuth,
} from '../../auth/authRequestWithRefresh';
import type { MobileAuthRequestContext } from '../../data/repositories/types';

/**
 * The default reader reads the public Add by RSS feed limit. The account reader reads the
 * signed-in account's own limit. Each call reads the server. `null` means the server did not
 * answer with a non-negative integer.
 */

const readNonNegativeInteger = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    return null;
  }
  return value;
};

export async function fetchAddByRssDefaultFeedLimit(): Promise<number | null> {
  try {
    const response = await requestWithoutMobileAuth((api) => api.reqProductMembershipGet());
    return readNonNegativeInteger(response.data.maxAddByRSSFeeds);
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
