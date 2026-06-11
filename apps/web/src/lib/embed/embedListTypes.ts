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

export type EmbedListRouteKind = 'podcast' | 'album' | 'playlist';

export type EmbedListData = {
  headerTitle: string;
  groups: EmbedListGroup[];
  pagination: EmbedListPagination;
  routeKind: EmbedListRouteKind;
  resourceId: string;
};

export type EmbedListFetchResult =
  | { status: 'not_found' }
  | { status: 'not_available' }
  | { status: 'ok'; listData: EmbedListData };
