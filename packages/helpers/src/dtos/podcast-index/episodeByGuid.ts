type Query = {
  guid: string;
  id?: string;
};

type Enclosure = {
  url: string;
  length?: number;
  type?: string;
};

type EpisodeValue = {
  model: {
    type: string;
    method: string;
    suggested: string;
  };
  destinations: Array<{
    name: string;
    address: string;
    type: string;
    split: number;
    fee: boolean;
    customKey: string;
    customValue: string;
  }>;
};

type Episode = {
  id?: number;
  guid: string;
  title?: string;
  link?: string;
  content?: string;
  contentEncoded?: string;
  datePublished?: number;
  datePublishedPretty?: string;
  author?: string;
  authorName?: string;
  itunes_episode_type?: string;
  itunes_season?: number;
  itunes_episode?: number;
  itunes_duration?: string;
  enclosure?: Enclosure;
  image?: string;
  feedId?: number;
  feedGuid?: string;
  feedTitle?: string;
  feedImage?: string;
  value?: EpisodeValue;
};

export type EpisodeByGuidResponse = {
  status: string;
  query: Query;
  episode?: Episode;
  description?: string;
};

export type EpisodeByGuidSecondaryParams =
  | { feedid: number; podcastguid?: string; feedurl?: string }
  | { podcastguid: string; feedid?: number; feedurl?: string }
  | { feedurl: string; feedid?: number; podcastguid?: string };
