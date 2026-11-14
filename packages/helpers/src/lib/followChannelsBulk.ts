/**
 * Contract for `POST /account/follow/channel/bulk`, shared by the API, the request helper, and
 * mobile's sign-up merge.
 *
 * Mobile lets a signed-out user subscribe locally; when they create an account those local follows
 * are pushed up in one request. Issuing one single-follow call per channel would trip rate limits
 * and leave a partial merge on the first failure, so the whole list goes up together and every
 * channel reports its own outcome.
 */

/** Upper bound on channels per request. Matches the OPML import feed cap. */
export const MAX_BULK_FOLLOW_CHANNELS = 1000;

/**
 * Upper bound on feeds per `POST /account/unfollow/bulk`, counting directory channels and Add by
 * RSS feed URLs together.
 */
export const MAX_BULK_UNFOLLOW_FEEDS = 1000;

export type BulkFollowChannelOutcome =
  /** Newly followed by this request. */
  | 'followed'
  /** Already followed beforehand. Repeat submissions report this instead of failing. */
  | 'already_following'
  /** No channel exists with that `id_text`; the rest of the batch is unaffected. */
  | 'not_found'
  /** The account's follow tier had no room left. Earlier rows in the batch may still be followed. */
  | 'follow_limit';

export interface BulkFollowChannelResult {
  channel_id_text: string;
  outcome: BulkFollowChannelOutcome;
  /** Present when `outcome` is `follow_limit`: the account's tier. */
  limit?: number;
}

export interface BulkFollowChannelsTotals {
  requested: number;
  followed: number;
  already_following: number;
  not_found: number;
  follow_limit: number;
}

export interface BulkFollowChannelsResponse {
  totals: BulkFollowChannelsTotals;
  results: BulkFollowChannelResult[];
  /** Present when any row is `follow_limit`. There is no renew path. */
  follow_limit?: {
    message: string;
    code: 'follow_limit_reached';
    i18nKey: 'membership.follow_limit_reached';
    limit: number;
  };
}

export function summarizeBulkFollowResults(
  results: BulkFollowChannelResult[]
): BulkFollowChannelsTotals {
  const totals: BulkFollowChannelsTotals = {
    requested: results.length,
    followed: 0,
    already_following: 0,
    not_found: 0,
    follow_limit: 0,
  };

  for (const result of results) {
    totals[result.outcome] += 1;
  }

  return totals;
}
