export enum Phase4Medium {
  Podcast = 'podcast',
  Music = 'music',
  Video = 'video',
  Film = 'film',
  Audiobook = 'audiobook',
  Newsletter = 'newsletter',
  Blog = 'blog',
  Publisher = 'publisher',
  Course = 'course',
  PodcastL = 'podcastl',
  MusicL = 'musicl',
  VideoL = 'videol',
  FilmL = 'filml',
  AudiobookL = 'audiobookl',
  NewsletterL = 'newsletterl',
  BlogL = 'blogl',
  PublisherL = 'publisherl',
  CourseL = 'coursel',
  Mixed = 'mixed',
}

export enum IntegrityType {
  SRI = 'sri',
  PGP = 'pgp-signature',
}

export enum Phase4LiveStatus {
  Pending = 'pending',
  Live = 'live',
  Ended = 'ended',
}

export type Phase4PodcastImage = {
  parsed: {
    url?: string | null;
    width?: number;
  };
};

export type Phase4ValueRecipient = {
  type: string;
  address: string;
  split: number;
  name?: string | null;
  customKey?: string | null;
  customValue?: string | null;
  fee: boolean;
};

export type Phase6RemoteItem = {
  feedGuid: string;
  itemGuid?: string;
  feedUrl?: string;
  medium?: Phase4Medium;
  title?: string;
};

type Phase6ValueTimeSplitBase = {
  startTime: number;
  duration: number;
};

type Phase6RemoteItemValueTimeSplit = Phase6ValueTimeSplitBase & {
  remoteStartTime: number;
  remotePercentage: number;
  remoteItem: Phase6RemoteItem;
  type: 'remoteItem';
};

type Phase6RecipientItemValueTimeSplit = Phase6ValueTimeSplitBase & {
  recipients: Phase4ValueRecipient[];
  type: 'recipients';
};

export type Phase6ValueTimeSplit =
  | Phase6RemoteItemValueTimeSplit
  | Phase6RecipientItemValueTimeSplit;

export type Phase4ValueTimeSplitRemoteItem = Phase6RemoteItem;
export type Phase4ValueTimeSplit = Phase6ValueTimeSplit;

export type Phase4Value = {
  type: string;
  method: string;
  suggested?: string | null;
  recipients: Phase4ValueRecipient[];
  valueTimeSplits?: Phase6ValueTimeSplit[];
};

export type Phase4PodcastLiveItemItem = Pick<Episode, 'guid' | 'enclosure'> &
  Partial<Omit<Episode, 'chat'>> & {
    chat?: Phase7Chat | { phase: '4'; url: string };
  };

export type Phase4PodcastLiveItem = Phase4PodcastLiveItemItem & {
  status: Phase4LiveStatus;
  start: Date;
  end?: Date;
  image?: string;
  contentLinks: Array<{
    url: string;
    title: string;
  }>;
};

export type Episode = {
  guid: string;
  enclosure: {
    url: string;
    type: string;
    length: number;
  };
  alternativeEnclosures?: Array<{
    type: string;
    length?: number | null;
    bitrate?: number | null;
    height?: number | null;
    lang?: string | null;
    title?: string | null;
    rel?: string | null;
    codecs?: string | null;
    integrity?: {
      type: IntegrityType;
      value: string;
    };
    source: Array<{
      uri: string;
      contentType: string;
    }>;
  }>;
  pubDate?: Date;
  title?: string | null;
  duration: number;
  explicit: boolean;
  link?: string | null;
  itunesEpisodeType?: string | null;
  podcastChapters?: {
    url?: string | null;
    type?: string | null;
  } | null;
  chat?: Phase7Chat;
  description?: string | null;
  itunesImage?: string | null;
  image?: string | null;
  podcastImages?: Phase4PodcastImage[];
  license?: {
    identifier?: string | null;
    url?: string | null;
  } | null;
  podcastLocation?: {
    geo?: string | null;
    osm?: string | null;
    name?: string | null;
  } | null;
  podcastPeople?: Array<{
    name?: string | null;
    role?: string | null;
    group?: string | null;
    img?: string | null;
    href?: string | null;
  }>;
  podcastSeason?: {
    number?: number | null;
    name?: string | null;
  } | null;
  itunesSeason?: number | null;
  podcastEpisode?: {
    number?: number | null;
    display?: string | null;
  } | null;
  itunesEpisode?: number | null;
  podcastSocialInteraction?: Array<{
    platform: string;
    url: string;
    id?: string | null;
    profileUrl?: string | null;
    priority?: number | null;
  }>;
  podcastSoundbites?: Array<{
    startTime: number;
    duration: number;
    title?: string | null;
  }>;
  podcastTranscripts?: Array<{
    url: string;
    type: string;
    language?: string | null;
    rel?: string | null;
  }>;
  podcastTxt?: Array<{
    purpose?: string | null;
    value: string;
  }>;
  value?: Phase4Value | null;
  podcastSeasonIndex?: number | null;
};

export type FeedObject = {
  guid?: string | null;
  title: string;
  medium?: Phase4Medium;
  author?: string | string[] | null;
  explicit: boolean;
  language?: string | null;
  link: string;
  itunesType?: string | null;
  items: Episode[];
  itunesCategory?: string[];
  chat?: Phase7Chat;
  description?: string | null;
  podcastFunding?: Array<{
    url?: string | null;
    message?: string | null;
  }>;
  itunesImage?: string | null;
  image?: {
    url?: string | null;
  } | null;
  podcastImages?: Phase4PodcastImage[];
  license?: {
    identifier?: string | null;
    url?: string | null;
  } | null;
  podcastLocation?: {
    geo?: string | null;
    osm?: string | null;
    name?: string | null;
  } | null;
  podcastPeople?: Array<{
    name?: string | null;
    role?: string | null;
    group?: string | null;
    img?: string | null;
    href?: string | null;
  }>;
  podroll?: Phase6RemoteItem[];
  podcastPublisher?: {
    feedGuid: string;
    feedUrl?: string;
  } | null;
  podcastRemoteItems?: Phase6RemoteItem[];
  podcastSocial?: Array<{
    platform: string;
    url: string;
    id?: string | null;
    priority?: number | null;
  }>;
  trailers?: Array<{
    url: string;
    title?: string | null;
    pubdate: Date;
    length?: number | null;
    type?: string | null;
    season?: number | null;
  }>;
  podcastTxt?: Array<{
    purpose?: string | null;
    value: string;
  }>;
  value?: Phase4Value | null;
};

export type PIChapter = {
  startTime: string;
  endTime: string | null;
  title: string | null;
  img: string | null;
  url: string | null;
  toc: boolean;
};

export type Phase7Chat = {
  phase: '7';
  server: string;
  protocol: string;
  accountId?: string;
  space?: string;
  embedUrl?: string;
};
