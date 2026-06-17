import type { QueryParamsStatsRange } from '@podverse/helpers-requests';

import { ROUTES } from '../../constants/routes';
import { WEB } from '../../constants/web';
import type { EmbedAspectRatioQuery } from './embedAspectRatio';
import { DEFAULT_EMBED_ASPECT_RATIO } from './embedAspectRatio';
import { DEFAULT_EMBED_BORDER_COLOR } from './embedBorderColor';
import type {
  EmbedBuilderListContentType,
  EmbedBuilderListSort,
  EmbedBuilderPlayerSize,
  EmbedBuilderQueryParams,
} from './embedBuilderTypes';
import type { EmbedPresentationQuery } from './embedTypes';
import { EMBED_LIST_VISIBLE_ROWS_DEFAULT } from './parseEmbedListRows';

export type EmbedBuilderUrlInput = {
  playerSize?: EmbedBuilderPlayerSize;
  listEnabled?: boolean;
  mediaPreference?: EmbedPresentationQuery;
  channel?: string | null;
  medium_id?: number | null;
  item?: string | null;
  clip?: string | null;
  chapter?: string | null;
  official_clip?: string | null;
  playlist?: string | null;
  playlistItem?: string | null;
  sort?: string | null;
  listContentType?: EmbedBuilderListContentType;
  listSort?: EmbedBuilderListSort;
  listRange?: QueryParamsStatsRange | null;
  startSeconds?: number;
  playIdText?: string | null;
  listVisibleRows?: number;
  showChapterMarkers?: boolean;
  aspectRatio?: EmbedAspectRatioQuery;
  borderColor?: string | null;
  origin?: string;
};

export function buildEmbedBuilderUrlPath(input: EmbedBuilderUrlInput = {}): string {
  const params = new URLSearchParams();

  if (input.playerSize !== null && input.playerSize !== undefined) {
    params.set('type', input.playerSize);
  }

  if (input.listEnabled === true) {
    params.set('list', '1');
  }

  if (input.mediaPreference !== null && input.mediaPreference !== undefined) {
    params.set('prefer', input.mediaPreference);
  }

  if (input.channel) {
    params.set('channel', input.channel);
  }

  if (input.medium_id !== null && input.medium_id !== undefined) {
    params.set('medium_id', String(input.medium_id));
  }

  if (input.item) {
    params.set('item', input.item);
  }

  if (input.clip) {
    params.set('clip', input.clip);
  }

  if (input.chapter) {
    params.set('chapter', input.chapter);
  }

  if (input.official_clip) {
    params.set('official_clip', input.official_clip);
  }

  if (input.playlist) {
    params.set('playlist', input.playlist);
  }

  if (input.playlistItem) {
    params.set('playlist_item', input.playlistItem);
  }

  if (input.sort) {
    params.set('sort', input.sort);
  }

  if (input.listContentType && input.listContentType !== 'episodes') {
    params.set('list_content', input.listContentType);
  }

  if (input.listSort && input.listSort !== 'recent') {
    params.set('list_sort', input.listSort);
  }

  if (input.listRange) {
    params.set('list_range', input.listRange);
  }

  const startSeconds = input.startSeconds ?? 0;
  if (startSeconds > 0) {
    params.set('t', String(startSeconds));
  }

  if (input.playIdText) {
    params.set('play_id_text', input.playIdText);
  }

  if (
    input.listVisibleRows !== undefined &&
    input.listVisibleRows !== EMBED_LIST_VISIBLE_ROWS_DEFAULT
  ) {
    params.set('rows', String(input.listVisibleRows));
  }

  if (input.showChapterMarkers === false) {
    params.set('chapter_markers', '0');
  }

  if (input.aspectRatio && input.aspectRatio !== DEFAULT_EMBED_ASPECT_RATIO) {
    params.set('ar', input.aspectRatio);
  }

  if (
    input.borderColor !== null &&
    input.borderColor !== undefined &&
    input.borderColor !== DEFAULT_EMBED_BORDER_COLOR
  ) {
    params.set('border', input.borderColor);
  }

  const queryString = params.toString();
  return queryString ? `${ROUTES.EMBED_BUILDER}?${queryString}` : ROUTES.EMBED_BUILDER;
}

export function buildEmbedBuilderUrl(input: EmbedBuilderUrlInput = {}): string {
  const origin = input.origin ?? WEB.origin;
  return `${origin}${buildEmbedBuilderUrlPath(input)}`;
}

export function embedBuilderQueryParamsToUrlInput(
  params: EmbedBuilderQueryParams
): EmbedBuilderUrlInput {
  return {
    playerSize: params.playerSize,
    listEnabled: params.listEnabled,
    mediaPreference: params.mediaPreference,
    channel: params.channel,
    medium_id: params.mediumId,
    item: params.item,
    clip: params.clip,
    chapter: params.itemChapter,
    official_clip: params.itemSoundbite,
    playlist: params.playlist,
    playlistItem: params.playlistItem,
    sort: params.sort,
    listContentType: params.listContentType,
    listSort: params.listSort,
    listRange: params.listRange,
    startSeconds: params.startSeconds,
    playIdText: params.playIdText,
    listVisibleRows: params.listVisibleRows,
    showChapterMarkers: params.showChapterMarkers,
    aspectRatio: params.aspectRatio,
    borderColor: params.borderColor,
  };
}
