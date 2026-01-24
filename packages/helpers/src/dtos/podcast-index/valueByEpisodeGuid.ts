type Query = {
  podcastguid: string;
  episodeguid: string;
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

type Value = {
  model: Model;
  destinations: Destination[];
  title: string;
  feedTitle: string;
};

export type ValueByEpisodeGuidResponse = {
  status: string;
  query: Query;
  value: Value;
  description: string;
};
