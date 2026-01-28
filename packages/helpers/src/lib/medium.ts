export enum MediumEnum {
  Publisher = 1,
  Podcast = 2,
  Music = 3,
  Video = 4,
  Film = 5,
  Audiobook = 6,
  Newsletter = 7,
  Blog = 8,
  Course = 9,
  Mixed = 10,
  PodcastL = 11,
  MusicL = 12,
  VideoL = 13,
  FilmL = 14,
  AudiobookL = 15,
  NewsletterL = 16,
  BlogL = 17,
  PublisherL = 18,
  CourseL = 19,
  AV = 20,
  PublisherAV = 21,
  PublisherPodcast = 22,
  PublisherMusic = 23,
  PublisherVideo = 24,
  PublisherFilm = 25,
  PublisherAudiobook = 26,
  PublisherNewsletter = 27,
  PublisherBlog = 28,
  PublisherCourse = 29,
}

export function getMediumEnumValue(input: string | null): MediumEnum {
  const sanitizedInput = input
    ?.toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');

  const mapping: { [key: string]: MediumEnum } = {
    publisher: MediumEnum.Publisher,
    podcast: MediumEnum.Podcast,
    music: MediumEnum.Music,
    video: MediumEnum.Video,
    film: MediumEnum.Film,
    audiobook: MediumEnum.Audiobook,
    newsletter: MediumEnum.Newsletter,
    blog: MediumEnum.Blog,
    course: MediumEnum.Course,
    mixed: MediumEnum.Mixed,
    podcastl: MediumEnum.PodcastL,
    musicl: MediumEnum.MusicL,
    videol: MediumEnum.VideoL,
    filml: MediumEnum.FilmL,
    audiobookl: MediumEnum.AudiobookL,
    newsletterl: MediumEnum.NewsletterL,
    blogl: MediumEnum.BlogL,
    publisherl: MediumEnum.PublisherL,
    coursel: MediumEnum.CourseL,
    av: MediumEnum.AV,
    publisherpodcast: MediumEnum.PublisherPodcast,
    publishermusic: MediumEnum.PublisherMusic,
    publishervideo: MediumEnum.PublisherVideo,
    publisherfilm: MediumEnum.PublisherFilm,
    publisheraudiobook: MediumEnum.PublisherAudiobook,
    publishernewsletter: MediumEnum.PublisherNewsletter,
    publisherblog: MediumEnum.PublisherBlog,
    publishercourse: MediumEnum.PublisherCourse,
    publisherav: MediumEnum.PublisherAV,
  };

  return (sanitizedInput && mapping[sanitizedInput]) || MediumEnum.Podcast;
}

export const supportedPlaylistMediums: { [key: number]: boolean } = {
  [MediumEnum.AV]: true,
  [MediumEnum.Music]: true,
};

export const supportedQueueMediums: { [key: number]: boolean } = {
  [MediumEnum.AV]: true,
  [MediumEnum.Music]: true,
};

export const QUERY_PARAMS_MEDIUMS = [
  'all',
  'podcasts',
  'videos',
  'music',
  'av',
  'publisher-podcasts',
  'publisher-videos',
  'publisher-music',
  'publisher-av',
] as const;
export type QueryParamsMedium = (typeof QUERY_PARAMS_MEDIUMS)[number];

export const QUERY_PARAMS_QUEUE_MEDIUMS = ['all', 'av', 'music'] as const;
export type QueryParamsQueueMedium = (typeof QUERY_PARAMS_QUEUE_MEDIUMS)[number];

export const getMediumFromQueryParam = (val: QueryParamsMedium): MediumEnum | null => {
  switch (val) {
    case 'podcasts':
      return MediumEnum.Podcast;
    case 'videos':
      return MediumEnum.Video;
    case 'av':
      return MediumEnum.AV;
    case 'music':
      return MediumEnum.Music;
    case 'publisher-podcasts':
      return MediumEnum.PublisherPodcast;
    case 'publisher-videos':
      return MediumEnum.PublisherVideo;
    case 'publisher-music':
      return MediumEnum.PublisherMusic;
    case 'publisher-av':
      return MediumEnum.PublisherAV;
    case 'all':
    default:
      return null;
  }
};

export const getQueryParamFromMediumId = (mediumId: number | null): QueryParamsMedium => {
  switch (mediumId) {
    case MediumEnum.Podcast:
      return 'podcasts';
    case MediumEnum.Video:
      return 'videos';
    case MediumEnum.AV:
      return 'av';
    case MediumEnum.Music:
      return 'music';
    case MediumEnum.PublisherPodcast:
      return 'publisher-podcasts';
    case MediumEnum.PublisherVideo:
      return 'publisher-videos';
    case MediumEnum.PublisherMusic:
      return 'publisher-music';
    case MediumEnum.PublisherAV:
      return 'publisher-av';
    default:
      return 'all';
  }
};

export const getQueryParamFromQueueMediumId = (mediumId: number | null): QueryParamsQueueMedium => {
  switch (mediumId) {
    case MediumEnum.AV:
      return 'av';
    case MediumEnum.Podcast:
      return 'av';
    case MediumEnum.Video:
      return 'av';
    case MediumEnum.Music:
      return 'music';
    default:
      return 'all';
  }
};

export const getMediumIdArrayFromType = (type: QueryParamsMedium | null): number[] | null => {
  switch (type) {
    case 'podcasts':
      return [MediumEnum.Podcast];
    case 'videos':
      return [MediumEnum.Video];
    case 'music':
      return [MediumEnum.Music];
    case 'av':
      return [MediumEnum.Podcast, MediumEnum.Video];
    case 'publisher-podcasts':
      return [MediumEnum.PublisherPodcast];
    case 'publisher-videos':
      return [MediumEnum.PublisherVideo];
    case 'publisher-music':
      return [MediumEnum.PublisherMusic];
    case 'publisher-av':
      return [MediumEnum.PublisherPodcast, MediumEnum.PublisherVideo];
    case 'all':
    default:
      return null;
  }
};

export const getQueueMediumIdFromType = (
  type: QueryParamsQueueMedium | null
): MediumEnum | null => {
  switch (type) {
    case 'av':
      return MediumEnum.AV;
    case 'music':
      return MediumEnum.Music;
    default:
      return null;
  }
};

export const getQueueMediumIdFromMediumId = (mediumId: number | null): MediumEnum | null => {
  return getQueueMediumIdFromType(getQueryParamFromQueueMediumId(mediumId));
};
