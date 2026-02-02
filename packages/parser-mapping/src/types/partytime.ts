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
  PublisherPodcast = 'publisherpodcast',
  PublisherMusic = 'publishermusic',
  PublisherVideo = 'publishervideo',
  PublisherFilm = 'publisherfilm',
  PublisherAudiobook = 'publisheraudiobook',
  PublisherNewsletter = 'publishernewsletter',
  PublisherBlog = 'publisherblog',
  PublisherCourse = 'publishercourse',
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

export type Phase4ValueTimeSplitRemoteItem = {
  feedGuid: string;
  // TODO: tighten type to required string when partytime shape is aligned
  feedUrl?: string | null;
  itemGuid?: string | null;
};

export type Phase4ValueTimeSplit =
  | {
      type: 'remoteItem';
      startTime: number;
      duration: number;
      remoteStartTime?: number | null;
      remotePercentage?: number | null;
      remoteItem: Phase4ValueTimeSplitRemoteItem;
    }
  | {
      type: 'recipients';
      startTime: number;
      duration: number;
      recipients: Phase4ValueRecipient[];
    };

export type Phase4Value = {
  type: string;
  method: string;
  suggested?: string | null;
  recipients: Phase4ValueRecipient[];
  // TODO: tighten to match partytime Phase6ValueTimeSplit shape
  valueTimeSplits?: Phase4ValueTimeSplit[];
};

export type Phase4PodcastLiveItem = {
  // TODO: tighten to match partytime live item shape
  title?: string;
  guid: string;
  enclosure: {
    url: string;
    length: number;
    type: string;
  };
  // TODO: tighten to Phase4LiveStatus enum
  status: string;
  start: Date;
  end?: Date;
  contentLinks: Array<{
    url: string;
    title: string;
  }>;
  // TODO: tighten once partytime chat union is modeled locally
  chat?: Phase7Chat | { phase: '4'; url: string };
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
    // TODO: tighten integrity type once IntegrityType is modeled locally
    integrity?: unknown;
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
  // TODO: tighten podcastSeasonIndex once partytime shape is modeled
  podcastSeasonIndex?: unknown;
};

export type FeedObject = {
  guid?: string | null;
  title: string;
  // TODO: tighten to Phase4Medium when partytime medium enum is modeled
  medium?: unknown;
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
  // TODO: tighten to partytime remote item shape (feedUrl/medium optionality)
  podroll?: Array<{
    feedGuid?: string | null;
    feedUrl?: string | null;
    medium?: unknown;
  }>;
  podcastPublisher?: {
    feedGuid?: string | null;
    feedUrl?: string | null;
  } | null;
  // TODO: tighten to partytime remote item shape (feedUrl/medium optionality)
  podcastRemoteItems?: Array<{
    feedGuid?: string | null;
    feedUrl?: string | null;
    medium?: unknown;
  }>;
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
