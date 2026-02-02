import type { ParseRSSFeedAndSaveToDatabaseOptions } from '@podverse/parser';

export type MQFeedMessage = {
  url: string;
  podcast_index_id: number;
  options: ParseRSSFeedAndSaveToDatabaseOptions;
};

export type MQAddByRSSMessage = {
  accountId: number;
  feedUrl: string;
  requestId: string;
  feedHash?: string;
};
