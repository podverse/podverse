/** Thrown when MetaBoost mb-v1/mbrss-v1 POST returns 403 with `code: sender_blocked`. */
export class MetaboostSenderBlockedPostError extends Error {
  readonly metaboostErrorCode = 'sender_blocked' as const;

  constructor(public readonly detailMessage: string) {
    super('MetaBoost ingest rejected: sender_blocked');
    this.name = 'MetaboostSenderBlockedPostError';
  }
}
