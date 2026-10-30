export const INDEX_PROVIDER_IDS = ['podcast_index'] as const;
export type IndexProviderId = (typeof INDEX_PROVIDER_IDS)[number];

const indexProviderIdSet: ReadonlySet<string> = new Set(INDEX_PROVIDER_IDS);

export function isIndexProviderId(value: unknown): value is IndexProviderId {
  return typeof value === 'string' && indexProviderIdSet.has(value);
}

/** A remote reference as it appears in a source feed. At least one key is non-null. */
export type IndexProviderFeedRef = {
  feedGuid: string | null;
  feedUrl: string | null;
};

export type IndexProviderFeed = {
  indexProvider: IndexProviderId;
  /** Provider's own feed id, always a string so non-numeric providers fit. */
  providerFeedId: string;
  /** Lowercased, trimmed; null when the provider reports none. */
  feedGuid: string | null;
  feedUrl: string;
  title: string | null;
  author: string | null;
  description: string | null;
  imageUrl: string | null;
  /** Raw medium string as the provider reports it (`podcast`, `music`, …). */
  medium: string | null;
  isDead: boolean;
};

export type IndexProviderItemRef = {
  providerFeedId: string;
  feedGuid: string | null;
  itemGuid: string;
};

export type IndexProviderItem = {
  indexProvider: IndexProviderId;
  providerFeedId: string;
  providerItemId: string | null;
  itemGuid: string;
  title: string | null;
  imageUrl: string | null;
  pubDate: Date | null;
  durationSeconds: number | null;
};

/**
 * `not_found` means the provider answered and does not know the feed or item.
 * `unavailable` means the lookup failed (network, 5xx, auth, retries exhausted).
 */
export type IndexProviderLookup<T> =
  { status: 'found'; value: T } | { status: 'not_found' } | { status: 'unavailable' };

export interface IndexProvider {
  readonly id: IndexProviderId;
  /** Implementations log unexpected provider failures and return statuses instead of throwing. */
  /**
   * Tries `feedGuid` first, then `feedUrl`.
   * Returns `not_found` only when every tried key is a clean miss.
   * Any failed request makes the result `unavailable`.
   */
  resolveFeed(ref: IndexProviderFeedRef): Promise<IndexProviderLookup<IndexProviderFeed>>;
  /**
   * Returns `found` with a map keyed by lowercased, trimmed GUID.
   * Unknown GUIDs are absent from the map. It never returns `not_found`.
   * Any failed chunk makes the whole result `unavailable`.
   */
  resolveFeedsByGuid(
    feedGuids: readonly string[]
  ): Promise<IndexProviderLookup<ReadonlyMap<string, IndexProviderFeed>>>;
  getFeedById(providerFeedId: string): Promise<IndexProviderLookup<IndexProviderFeed>>;
  resolveItem(ref: IndexProviderItemRef): Promise<IndexProviderLookup<IndexProviderItem>>;
}
