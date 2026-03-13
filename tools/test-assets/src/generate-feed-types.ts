import { type MultiConfig } from './generate-feed-cli-utils.js';

/** Per 07d: URL and channel GUID for a feed already written in this run (for remoteItem/podroll/publisher). */
export type WrittenFeedInfo = { url: string; guid: string };

export type BuildFeedResult = {
  xml: string;
  channelGuid: string;
  chaptersToWrite: { filename: string; content: string }[];
  transcriptsToWrite: { filename: string; content: string }[];
};

export type RunGenerateFeedAndAssetsOptions = {
  itemsConfig?: MultiConfig;
  multiConfig?: MultiConfig;
  baseUrl?: string;
  /** When true, overwrite existing RSS feed files only (media assets are never overwritten). */
  forceRss?: boolean;
  /** When true, include podcast:value (channel + item) with fake Lightning data. CLI prompts for confirmation. */
  addFakeValueTags?: boolean;
};

export type RunGenerateFeedAndAssetsResult = {
  success: boolean;
  written: number;
  skipped: number;
};
