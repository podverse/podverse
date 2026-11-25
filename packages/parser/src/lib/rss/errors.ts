export class FeedIsParsingError extends Error {
  constructor(feedId: number) {
    super(`Feed ${feedId} is already parsing`);
    this.name = 'FeedIsParsingError';
  }
}

export class FeedNoChangesSinceLastParsedError extends Error {
  constructor(feedId: number) {
    super(`Feed ${feedId} has no changes since last parsed.`);
    this.name = 'FeedNoChangesSinceLastParsedError';
  }
}

/** The response body was not an RSS or Atom feed. */
export class FeedNotAFeedError extends Error {
  constructor() {
    super('Feed body is not an RSS or Atom feed');
    this.name = 'FeedNotAFeedError';
  }
}

export type FeedNotInCatalogReason = 'not_on_allowlist' | 'music' | 'medium_unknown';

/** The instance's catalog settings refuse a feed that has no stored row. */
export class FeedNotInCatalogError extends Error {
  readonly reason: FeedNotInCatalogReason;

  constructor(podcastIndexId: number, reason: FeedNotInCatalogReason) {
    super(`Feed not added: podcast_index_id=${podcastIndexId} reason=${reason}`);
    this.name = 'FeedNotInCatalogError';
    this.reason = reason;
  }
}
