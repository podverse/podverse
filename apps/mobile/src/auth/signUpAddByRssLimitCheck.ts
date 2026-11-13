import { isMobileE2eFromEnv } from '../config/e2eEnv';
import { addByRssRepository } from '../data/repositories';
import { fetchAddByRssDefaultFeedLimit } from '../lib/addByRss/feedLimit';
import type { SignUpAddByRssLimitGate } from './signUpAddByRssLimitGate';
import { resolveSignUpAddByRssLimitGate } from './signUpAddByRssLimitGate';

/**
 * The E2E API's default limit is the production default, and lowering it there would refuse the
 * signed-in Add by RSS flows. Under the harness the sign-up check uses this limit instead, so a
 * flow can exceed it with two device feeds.
 */
export const MOBILE_E2E_SIGNUP_ADD_BY_RSS_FEED_LIMIT = 1;

export const checkSignUpAddByRssLimit = async (): Promise<SignUpAddByRssLimitGate> => {
  let feedCount: number;
  try {
    feedCount = (await addByRssRepository.listSignedOutFollowedFeeds()).length;
  } catch (error) {
    console.warn('[signup-add-by-rss-limit] feed count failed', error);
    return { kind: 'limit_unavailable' };
  }

  if (feedCount === 0) {
    return { kind: 'sign_up' };
  }

  let limit: number | null;
  if (isMobileE2eFromEnv()) {
    limit = MOBILE_E2E_SIGNUP_ADD_BY_RSS_FEED_LIMIT;
  } else {
    try {
      limit = await fetchAddByRssDefaultFeedLimit();
    } catch {
      limit = null;
    }
  }

  return resolveSignUpAddByRssLimitGate({ feedCount, limit });
};
