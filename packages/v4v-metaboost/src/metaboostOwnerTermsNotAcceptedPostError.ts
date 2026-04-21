/** Thrown when MetaBoost mb-v1/mbrss-v1 POST returns 403 with `code: owner_terms_not_accepted_current`. */
export class MetaboostOwnerTermsNotAcceptedPostError extends Error {
  readonly metaboostErrorCode = 'owner_terms_not_accepted_current' as const;

  constructor(public readonly detailMessage: string) {
    super('MetaBoost ingest rejected: owner_terms_not_accepted_current');
    this.name = 'MetaboostOwnerTermsNotAcceptedPostError';
  }
}
