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
