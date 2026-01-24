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
  generator: string;
  language: string;
  type: number;
  dead: number;
  crawlErrors: number;
  parseErrors: number;
  categories: Categories;
  locked: number;
  popularity: number;
  imageUrlHash: number;
  value: Value;
  funding: Funding;
  podcastGuid: string;
  valueCreatedOn: number;
};

export type PodcastsByTagResponse = {
  status: string;
  feeds: Feed[];
  count: number;
  total: number;
  nextStartAt: number;
  description: string;
};
