type Query = {
  id: string;
};

// Categories is a map of category id to category name
type Categories = {
  [key: string]: string;
};

export type PodcastByIdFeed = {
  id: number;
  podcastGuid: string;
  medium: string;
  title: string;
  url: string;
  originalUrl: string;
  link: string;
  description: string;
  author: string;
  ownerName: string;
  image: string;
  artwork: string;
  lastUpdateTime: number;
  lastCrawlTime: number;
  lastParseTime: number;
  lastGoodHttpStatusTime: number;
  lastHttpStatus: number;
  contentType: string;
  itunesId: number;
  itunesType: string;
  generator: string;
  language: string;
  explicit: boolean;
  type: number;
  dead: number;
  chash: string;
  episodeCount: number;
  crawlErrors: number;
  parseErrors: number;
  categories: Categories;
  locked: number;
  imageUrlHash: number;
};

export type PodcastIndexPodcastByIdResponse = {
  status: string;
  query: Query;
  feed: PodcastByIdFeed;
  description: string;
};
