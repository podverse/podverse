import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AddByRSSResourceType } from '@podverse/helpers';

const ADD_BY_RSS_FEEDS_KEY = 'podverse.mobile.add_by_rss.feeds';

export type MobileAddByRSSFeedRecord = {
  id: number;
  idText: string;
  resourceType: AddByRSSResourceType;
  feedUrl: string;
  title: string | null;
  imageUrl: string | null;
  updatedAt: string;
  enclosureUrl: string | null;
  playbackPosition: string | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const isResourceType = (value: unknown): value is AddByRSSResourceType => {
  return (
    value === 'podcasts' ||
    value === 'episodes' ||
    value === 'artists' ||
    value === 'albums' ||
    value === 'tracks' ||
    value === 'livestreams'
  );
};

const parseFeedRecord = (value: unknown): MobileAddByRSSFeedRecord | null => {
  if (!isRecord(value)) {
    return null;
  }

  const id = value.id;
  const idText = value.idText;
  const resourceType = value.resourceType;
  const feedUrl = value.feedUrl;
  const title = value.title;
  const imageUrl = value.imageUrl;
  const updatedAt = value.updatedAt;
  const enclosureUrl = value.enclosureUrl;
  const playbackPosition = value.playbackPosition;

  if (
    typeof id !== 'number' ||
    typeof idText !== 'string' ||
    !isResourceType(resourceType) ||
    typeof feedUrl !== 'string' ||
    (title !== null && typeof title !== 'string') ||
    (imageUrl !== null && typeof imageUrl !== 'string') ||
    typeof updatedAt !== 'string' ||
    (enclosureUrl !== null && typeof enclosureUrl !== 'string') ||
    (playbackPosition !== null && typeof playbackPosition !== 'string')
  ) {
    return null;
  }

  return {
    id,
    idText,
    resourceType,
    feedUrl,
    title,
    imageUrl,
    updatedAt,
    enclosureUrl,
    playbackPosition,
  };
};

export const readAddByRSSFeeds = async (): Promise<MobileAddByRSSFeedRecord[]> => {
  const value = await AsyncStorage.getItem(ADD_BY_RSS_FEEDS_KEY);
  if (value === null) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((entry) => parseFeedRecord(entry))
      .filter((entry): entry is MobileAddByRSSFeedRecord => entry !== null);
  } catch {
    return [];
  }
};

export const writeAddByRSSFeeds = async (records: MobileAddByRSSFeedRecord[]): Promise<void> => {
  await AsyncStorage.setItem(ADD_BY_RSS_FEEDS_KEY, JSON.stringify(records));
};
