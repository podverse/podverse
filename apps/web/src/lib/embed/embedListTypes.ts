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

export type EmbedListPagination = {
  page: number;
  totalPages: number;
  hasNextPage: boolean;
};

export type EmbedListRouteKind = 'podcast' | 'album' | 'playlist' | 'episode-chapters';

export type EmbedListData = {
  headerTitle: string;
  groups: EmbedListGroup[];
  pagination: EmbedListPagination;
  routeKind: EmbedListRouteKind;
  resourceId: string;
  /** When play_id_text is not on the loaded page, playback still uses this row. */
  playIdTextOverrideRow: EmbedListRow | null;
};

export type EmbedListFetchResult =
  { status: 'not_found' } | { status: 'not_available' } | { status: 'ok'; listData: EmbedListData };
