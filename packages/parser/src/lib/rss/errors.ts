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
