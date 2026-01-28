import { ParseRSSFeedAndSaveToDatabaseOptions } from '@podverse/parser';

export type MQFeedMessage = {
  url: string;
  podcast_index_id: number;
  options: ParseRSSFeedAndSaveToDatabaseOptions;
};
