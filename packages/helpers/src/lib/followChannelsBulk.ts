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

export type BulkFollowChannelOutcome =
  /** Newly followed by this request. */
  | 'followed'
  /** Already followed beforehand. Repeat submissions report this instead of failing. */
  | 'already_following'
  /** No channel exists with that `id_text`; the rest of the batch is unaffected. */
  | 'not_found';

export interface BulkFollowChannelResult {
  channel_id_text: string;
  outcome: BulkFollowChannelOutcome;
}

export interface BulkFollowChannelsTotals {
  requested: number;
  followed: number;
  already_following: number;
  not_found: number;
}

export interface BulkFollowChannelsResponse {
  totals: BulkFollowChannelsTotals;
  results: BulkFollowChannelResult[];
}

export function summarizeBulkFollowResults(
  results: BulkFollowChannelResult[]
): BulkFollowChannelsTotals {
  const totals: BulkFollowChannelsTotals = {
    requested: results.length,
    followed: 0,
    already_following: 0,
    not_found: 0,
  };

  for (const result of results) {
    totals[result.outcome] += 1;
  }

  return totals;
}
