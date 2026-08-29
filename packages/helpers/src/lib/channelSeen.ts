/**
 * Per-channel **seen** state: one `last_seen_at` timestamp per channel per account, and the unseen
 * count derived from it.
 *
 * Content is **seen / unseen**; the notification inbox is **read / unread**. The two indicators are
 * deliberately different words so a badge is never ambiguous about which one it is counting.
 *
 * Storing a timestamp rather than a flag per episode is what keeps this O(1) per subscription: a
 * channel's unseen count is however many of its items published after the timestamp, so the storage
 * does not grow with the number of episodes and syncing it is a single value per channel.
 *
 * These rules live here rather than in the API because every surface applies them. Mobile derives
 * counts locally so a signed-out user still gets badges, web reads them from the API, and both merge
 * timestamps the same way — a rule implemented three times is a rule that will disagree three ways.
 */

/**
 * Highest count a badge states exactly. Past this the answer is `20+`, because the difference
 * between 21 and 200 does not change what anyone does next, and bounding it is what keeps the count
 * query from scanning a decade of a daily show.
 */
export const CHANNEL_UNSEEN_COUNT_CAP = 20;

/**
 * Channels one read returns.
 *
 * Reading is cheap per channel — the count query probes a composite index and stops one row past the
 * display cap — so the cost is a fixed number of index lookups per follow rather than anything that
 * grows with how much a channel publishes. That is what makes a page this size affordable, and a
 * page this size is what lets a surface badge a whole subscription list from one request. It stays a
 * cap rather than becoming "all of them" because nothing limits how many channels an account follows.
 */
export const CHANNEL_SEEN_READ_PAGE_LIMIT = 500;

/**
 * Channels one mark request may write.
 *
 * Smaller than a read page because a write is a real upsert per row rather than an index probe, and
 * because the only caller sending many at once is a sync merge, which chunks anyway.
 */
export const CHANNEL_SEEN_MARK_BATCH_LIMIT = 60;

export type ChannelSeenState = {
  channel_id_text: string;
  /** `null` when this account has never opened the channel on any device. */
  last_seen_at: string | null;
  /** Items published since `last_seen_at`, capped at `CHANNEL_UNSEEN_COUNT_CAP`. */
  unseen_count: number;
  /** True when the real count exceeds the cap, which is what makes `20+` honest rather than a guess. */
  has_more_unseen: boolean;
};

export type ChannelSeenListResponse = {
  data: ChannelSeenState[];
  meta: {
    page: number;
    count: number;
    limit: number;
  };
};

/**
 * Seen state for an add-by-RSS feed, which is a timestamp and nothing else.
 *
 * The server stores no items for these feeds, so it cannot say how many are unseen — only the device
 * holding the parsed feed can count that. Syncing the timestamp is still worth it: it is what makes
 * opening a feed on the phone clear its badge on the desktop.
 */
export type AddByRssSeenState = {
  feed_url: string;
  last_seen_at: string | null;
};

export type AddByRssSeenListResponse = {
  data: AddByRssSeenState[];
  meta: {
    page: number;
    count: number;
    limit: number;
  };
};

export type AddByRssSeenMarkEntry = {
  feed_url: string;
  /** ISO timestamp to record. Omitted means now. */
  last_seen_at?: string;
};

export type AddByRssSeenMarkRequest = {
  entries: AddByRssSeenMarkEntry[];
};

export type AddByRssSeenMarkResponse = {
  data: AddByRssSeenState[];
};

/** One channel to mark, optionally at a specific moment rather than now. */
export type ChannelSeenMarkEntry = {
  channel_id_text: string;
  /**
   * ISO timestamp to record. Omitted means now, which is the ordinary case of opening a channel;
   * supplied means replaying a moment the device already recorded, as the sign-in merge does.
   */
  last_seen_at?: string;
};

export type ChannelSeenMarkRequest = {
  entries: ChannelSeenMarkEntry[];
};

export type ChannelSeenMarkResponse = {
  data: ChannelSeenState[];
};

export type ChannelSeenMarkAllResponse = {
  data: {
    last_seen_at: string;
    /** Follows updated, so a caller can tell a real sweep from a no-op on an empty account. */
    updated_count: number;
  };
};

/**
 * Apply the cap to a raw count.
 *
 * Callers fetch one row past the cap so the overflow is known rather than assumed: a channel with
 * exactly 20 unseen items should read `20`, not `20+`.
 */
export const capUnseenCount = (
  rawCount: number
): { has_more_unseen: boolean; unseen_count: number } => {
  if (!Number.isFinite(rawCount) || rawCount <= 0) {
    return { has_more_unseen: false, unseen_count: 0 };
  }

  const whole = Math.floor(rawCount);
  return {
    has_more_unseen: whole > CHANNEL_UNSEEN_COUNT_CAP,
    unseen_count: Math.min(whole, CHANNEL_UNSEEN_COUNT_CAP),
  };
};

/**
 * Count how many of a channel's publish dates fall after the moment it was last seen.
 *
 * Stops at one past the cap. Mobile runs this over the window it stores locally, so a signed-out
 * user gets the same badge a signed-in one does without asking the server for it.
 *
 * A `null` timestamp means the channel has never been opened, which reads as nothing unseen rather
 * than everything unseen — following a show should not immediately claim its whole back catalogue
 * is new.
 */
export const countUnseenByPubDate = ({
  lastSeenAtMs,
  pubDatesMs,
}: {
  lastSeenAtMs: number | null;
  pubDatesMs: readonly (number | null)[];
}): { has_more_unseen: boolean; unseen_count: number } => {
  if (lastSeenAtMs === null) {
    return { has_more_unseen: false, unseen_count: 0 };
  }

  let raw = 0;
  for (const pubDateMs of pubDatesMs) {
    if (pubDateMs === null || pubDateMs <= lastSeenAtMs) {
      continue;
    }
    raw += 1;
    if (raw > CHANNEL_UNSEEN_COUNT_CAP) {
      break;
    }
  }

  return capUnseenCount(raw);
};

/**
 * What a subscription row should put on its unseen badge, or `null` when it should show none.
 *
 * Zero is an absence rather than a number: a badge reading `0` is a mark on the row that says
 * nothing, and every row a user has caught up on would carry one.
 *
 * `isCapped` is the difference between `20` and `20+`, and it comes from the count rather than from
 * comparing against the cap at the call site — a caller that compared would render `20+` for a
 * channel with exactly twenty unseen episodes.
 */
export type ChannelUnseenBadge = {
  count: number;
  isCapped: boolean;
};

export const describeUnseenBadge = ({
  has_more_unseen,
  unseen_count,
}: Pick<ChannelSeenState, 'has_more_unseen' | 'unseen_count'>): ChannelUnseenBadge | null => {
  if (unseen_count <= 0) {
    return null;
  }

  return { count: Math.min(unseen_count, CHANNEL_UNSEEN_COUNT_CAP), isCapped: has_more_unseen };
};

/**
 * Reconcile two views of when a channel was last seen, keeping the later one.
 *
 * Seen state only moves forward. A device that was offline while the user listened elsewhere must
 * not re-badge what they already heard, and unlike a subscription list — where merging can resurrect
 * something deliberately removed — a timestamp that only advances cannot lose information. That is
 * what makes this safe to run on every sync, repeatedly, in either direction.
 */
export const mergeLastSeenAt = (
  left: string | null | undefined,
  right: string | null | undefined
): string | null => {
  const leftMs = toEpochMs(left);
  const rightMs = toEpochMs(right);

  if (leftMs === null) {
    return rightMs === null ? null : (right ?? null);
  }
  if (rightMs === null) {
    return left ?? null;
  }

  return rightMs > leftMs ? (right ?? null) : (left ?? null);
};

/** Whether a candidate would move a stored timestamp forward, so a no-op write can be skipped. */
export const isLaterLastSeenAt = (
  candidate: string | null | undefined,
  stored: string | null | undefined
): boolean => {
  const candidateMs = toEpochMs(candidate);
  if (candidateMs === null) {
    return false;
  }

  const storedMs = toEpochMs(stored);
  return storedMs === null || candidateMs > storedMs;
};

const toEpochMs = (value: string | null | undefined): number | null => {
  if (value === null || value === undefined || value.length === 0) {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
};
