import type { ParseRSSFeedAndSaveToDatabaseOptions } from '@podverse/parser';

export type MQTraceContext = {
  traceparent: string;
  tracestate?: string;
};

export type MQTraceEnvelopeFields = {
  traceContext?: MQTraceContext;
};

export type MQFeedMessage = {
  url: string;
  podcast_index_id: number;
  options: ParseRSSFeedAndSaveToDatabaseOptions;
} & MQTraceEnvelopeFields;

export type MQAddByRSSMessage = {
  accountId: number;
  feedUrl: string;
  requestId: string;
  feedHash?: string;
  etag?: string;
  lastModified?: string;
  /**
   * Sealed Basic Auth credentials (`sealAddByRssCredentials`, `@podverse/helpers-backend`), bound
   * to this message's accountId, requestId, and feedUrl. Plaintext credentials never ride the
   * queue; this field is excluded from the dedupe id.
   */
  credentialsEnvelope?: string;
} & MQTraceEnvelopeFields;

export type MQOpmlImportFeed = {
  title?: string;
  feedUrl: string;
};

export type MQOpmlImportMessage = {
  accountId: number;
  requestId: string;
  feeds: MQOpmlImportFeed[];
} & MQTraceEnvelopeFields;

export type MQImageShrinkHintMessage = {
  url: string;
  entityType: 'channel' | 'item';
  hintCreatedAt: string;
} & MQTraceEnvelopeFields;
