type QueryGuids = {
  [key: string]: string[];
};

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

type ValueItem = {
  podcastGUID: string;
  guid: string;
  title: string;
  feedTitle: string;
  model: Model;
  destinations: Destination[];
};

export type ValueBatchByEpisodeGuidResponse = {
  status: string;
  query: {
    guids: QueryGuids;
  };
  value: ValueItem[];
  description: string;
  allFound: boolean;
  found: number;
};
