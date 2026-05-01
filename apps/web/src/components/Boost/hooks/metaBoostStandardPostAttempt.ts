/**
 * Whether the client should attempt the MetaBoost standard ingest POST after Lightning succeeds.
 * Standard ingest does not reject on a bucket minimum; do not gate POST on converted amount here.
 */
export function shouldAttemptMetaBoostStandardPost(mbrssV1HttpMessagingEnabled: boolean): boolean {
  return mbrssV1HttpMessagingEnabled;
}
