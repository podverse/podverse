import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFERRED_MEDIA_TYPE_KEY = 'preferred_media_type';

const HOME_MEDIA_TYPES = ['podcasts', 'episodes', 'clips', 'artists', 'albums', 'tracks'] as const;

export type HomeMediaType = (typeof HOME_MEDIA_TYPES)[number];

const isHomeMediaType = (value: string): value is HomeMediaType => {
  return HOME_MEDIA_TYPES.some((mediaType) => mediaType === value);
};

export const DEFAULT_HOME_MEDIA_TYPE: HomeMediaType = 'podcasts';

export const readPreferredMediaType = async (): Promise<HomeMediaType | null> => {
  const value = await AsyncStorage.getItem(PREFERRED_MEDIA_TYPE_KEY);
  if (value === null) {
    return null;
  }

  if (!isHomeMediaType(value)) {
    return null;
  }

  return value;
};

export const writePreferredMediaType = async (mediaType: HomeMediaType): Promise<void> => {
  await AsyncStorage.setItem(PREFERRED_MEDIA_TYPE_KEY, mediaType);
};
