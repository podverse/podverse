import type { EmbedMediaType } from './embedTypes';
import type { EmbedSingleResourcePayload } from './fetchEmbedSingleResource';

export type EmbedListRow = EmbedSingleResourcePayload & {
  rowKey: string;
  playIdText: string;
  listLabel: string;
  mediaType: EmbedMediaType;
};

export type EmbedListGroup = {
  groupKey: string;
  title: string | null;
  rows: EmbedListRow[];
};

export type EmbedListData = {
  headerTitle: string;
  groups: EmbedListGroup[];
};

export type EmbedListFetchResult =
  | { status: 'not_found' }
  | { status: 'not_available' }
  | { status: 'ok'; listData: EmbedListData };
