import type { SortPrefScope } from '@podverse/helpers';
import { pickSortPrefToken } from '@podverse/helpers';

import { readSortPref, writeSortPref } from './sortPrefs';

const QUEUE_LIST_SCOPE: SortPrefScope = { kind: 'list', name: 'queue' };

const QUEUE_LIST_MEDIUMS = ['av', 'music'] as const;

export type QueueListMedium = (typeof QUEUE_LIST_MEDIUMS)[number];

export const DEFAULT_QUEUE_LIST_MEDIUM: QueueListMedium = 'av';

export const readQueueListMedium = async (): Promise<QueueListMedium> => {
  const stored = await readSortPref(QUEUE_LIST_SCOPE);
  return pickSortPrefToken(stored?.type, QUEUE_LIST_MEDIUMS, DEFAULT_QUEUE_LIST_MEDIUM);
};

export const writeQueueListMedium = async (medium: QueueListMedium): Promise<void> => {
  await writeSortPref(QUEUE_LIST_SCOPE, { type: medium });
};
