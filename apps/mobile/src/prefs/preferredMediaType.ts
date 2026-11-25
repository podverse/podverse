import type { MediaTypePreference } from '@podverse/helpers';

import { getMobileConfig } from '../config';
import type { HomeMediaType } from './prefsStore';
import {
  DEFAULT_HOME_MEDIA_TYPE,
  DEFAULT_PLAYBACK_MEDIA_TYPE,
  getPref,
  setPref,
} from './prefsStore';

const HOME_MEDIA_TYPE_PREF_KEY = 'preferred_media_type';
const PLAYBACK_MEDIA_TYPE_PREF_KEY = 'pmt';

const HOME_MEDIA_TYPES = [
  'podcasts',
  'episodes',
  'clips',
  'artists',
  'albums',
  'tracks',
  'livestreams',
] as const satisfies readonly HomeMediaType[];

/** Chip Home opens on when nothing is stored. */
export const defaultHomeMediaType = (): HomeMediaType => {
  const chip = getMobileConfig().listScreens.home.chip;
  return HOME_MEDIA_TYPES.find((type) => type === chip) ?? DEFAULT_HOME_MEDIA_TYPE;
};

export const readPreferredMediaType = async (): Promise<HomeMediaType | null> => {
  return getPref(HOME_MEDIA_TYPE_PREF_KEY);
};

export const writePreferredMediaType = async (mediaType: HomeMediaType): Promise<void> => {
  await setPref(HOME_MEDIA_TYPE_PREF_KEY, mediaType);
};

export type { HomeMediaType } from './prefsStore';
export { DEFAULT_HOME_MEDIA_TYPE, DEFAULT_PLAYBACK_MEDIA_TYPE };

export const readPlaybackMediaTypePref = async (): Promise<MediaTypePreference> => {
  const stored = await getPref(PLAYBACK_MEDIA_TYPE_PREF_KEY);
  return stored ?? DEFAULT_PLAYBACK_MEDIA_TYPE;
};

export const writePlaybackMediaTypePref = async (mediaType: MediaTypePreference): Promise<void> => {
  await setPref(PLAYBACK_MEDIA_TYPE_PREF_KEY, mediaType);
};
