import AsyncStorage from '@react-native-async-storage/async-storage';

import { SharableStatusEnum } from '@podverse/helpers';

export type ClipVisibility =
  | SharableStatusEnum.Public
  | SharableStatusEnum.Unlisted
  | SharableStatusEnum.Private;

const CLIP_VISIBILITY_PREF_KEY = 'clip.visibility';
const HAS_SEEN_MAKE_CLIP_HOW_TO_PREF_KEY = 'clip.has_seen_make_clip_how_to';
const DEFAULT_CLIP_VISIBILITY: ClipVisibility = SharableStatusEnum.Private;

const isClipVisibility = (value: number): value is ClipVisibility => {
  return (
    value === SharableStatusEnum.Public ||
    value === SharableStatusEnum.Unlisted ||
    value === SharableStatusEnum.Private
  );
};

export const readClipVisibilityPref = async (): Promise<ClipVisibility> => {
  const stored = await AsyncStorage.getItem(CLIP_VISIBILITY_PREF_KEY);
  if (stored === null) {
    return DEFAULT_CLIP_VISIBILITY;
  }

  const parsed = Number.parseInt(stored, 10);
  if (!Number.isFinite(parsed) || !isClipVisibility(parsed)) {
    return DEFAULT_CLIP_VISIBILITY;
  }

  return parsed;
};

export const writeClipVisibilityPref = async (visibility: ClipVisibility): Promise<void> => {
  await AsyncStorage.setItem(CLIP_VISIBILITY_PREF_KEY, String(visibility));
};

export const hasSeenMakeClipHowToPref = async (): Promise<boolean> => {
  const stored = await AsyncStorage.getItem(HAS_SEEN_MAKE_CLIP_HOW_TO_PREF_KEY);
  return stored === '1';
};

export const writeSeenMakeClipHowToPref = async (): Promise<void> => {
  await AsyncStorage.setItem(HAS_SEEN_MAKE_CLIP_HOW_TO_PREF_KEY, '1');
};
