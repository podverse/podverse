import type { SortPrefScope } from '@podverse/helpers';

import { readSortPref, subscribeSortPref, writeSortPref } from '../../prefs/sortPrefs';
import {
  DEFAULT_BROWSE_MEDIA_TYPE,
  DEFAULT_BROWSE_RANGE,
  isBrowseMediaType,
  isBrowseRangeOption,
} from './browseTypes';
import type { BrowseMediaType, BrowseRangeOption } from './browseTypes';

const BROWSE_ROOT_SCOPE: SortPrefScope = { kind: 'list', name: 'browse' };

export type BrowseListPrefs = {
  category: string | null;
  mediaType: BrowseMediaType;
  range: BrowseRangeOption;
};

export const readBrowseListPrefs = async (): Promise<BrowseListPrefs> => {
  const stored = await readSortPref(BROWSE_ROOT_SCOPE);
  const mediaType =
    stored?.mediaType !== undefined && isBrowseMediaType(stored.mediaType)
      ? stored.mediaType
      : DEFAULT_BROWSE_MEDIA_TYPE;
  const range =
    stored?.range !== undefined && isBrowseRangeOption(stored.range)
      ? stored.range
      : DEFAULT_BROWSE_RANGE;
  const category = stored?.category !== undefined ? stored.category : null;

  return {
    category,
    mediaType,
    range,
  };
};

export const writeBrowseMediaType = async (mediaType: BrowseMediaType): Promise<void> => {
  await writeSortPref(BROWSE_ROOT_SCOPE, { mediaType });
};

export const writeBrowseRange = async (range: BrowseRangeOption): Promise<void> => {
  await writeSortPref(BROWSE_ROOT_SCOPE, { range });
};

export const writeBrowseCategory = async (category: string | null): Promise<void> => {
  await writeSortPref(BROWSE_ROOT_SCOPE, {
    category: category === null ? undefined : category,
  });
};

export const subscribeBrowseListPrefs = (listener: () => void): (() => void) => {
  return subscribeSortPref(BROWSE_ROOT_SCOPE, listener);
};
