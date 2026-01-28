type Model = {
  type: string;
  method: string;
  suggested: string;
};

type Destination = {
  name: string;
  address: string;
  type: string;
  split: number;
  fee: boolean;
  customKey: string;
  customValue: string;
};

type Value = {
  model: Model;
  destinations: Destination[];
};

type Funding = {
  url: string;
  message: string;
};

type Categories = {
  [key: string]: string;
};

type Feed = {
  id: number;
  podcastGuid: string;
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
  itunesId: number | null;
  itunesType?: string;
  generator?: string;
  language?: string;
  explicit?: boolean;
  type?: number;
  medium?: string;
  dead?: number;
  chash?: string;
  episodeCount?: number;
  crawlErrors?: number;
  parseErrors?: number;
  categories?: Categories;
  locked?: number;
  imageUrlHash?: number;
  value?: Value;
  funding?: Funding;
};

export type PodcastBatchByFeedGuidResponse = {
  status: string;
  allFound: boolean;
  found: number;
  feeds: Feed[];
  description: string;
};
