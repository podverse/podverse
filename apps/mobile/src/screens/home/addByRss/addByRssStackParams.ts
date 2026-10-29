/**
 * Routes the Add by RSS screens navigate between. Registered on the Home, Library, Browse, and
 * Search stacks.
 */
export type AddByRssDetailStackParamList = {
  AddByRssCredentials: { feedIdText: string };
  AddByRssEpisodeDetail: { feedIdText: string; itemKey: string };
  AddByRssLivestreamDetail: { feedIdText: string; liveItemKey: string };
  AddByRssPodcastDetail: { feedIdText: string };
  /** A remote feed the index provider does not know. `title` is the reference's own title. */
  AddByRssRemoteFeedDetail: { feedUrl: string; title?: string };
  AddByRssTrackDetail: { feedIdText: string; itemKey: string };
};
