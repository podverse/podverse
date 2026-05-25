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
} & MQTraceEnvelopeFields;

export type MQImageShrinkHintMessage = {
  url: string;
  entityType: 'channel' | 'item';
  hintCreatedAt: string;
} & MQTraceEnvelopeFields;
