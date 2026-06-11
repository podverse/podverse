import { ROUTES } from '../../constants/routes';
import { WEB } from '../../constants/web';
import type { EmbedBuilderQueryParams, EmbedBuilderType } from './embedBuilderTypes';

export type EmbedBuilderUrlInput = {
  type?: EmbedBuilderType;
  channel?: string | null;
  medium_id?: number | null;
  item?: string | null;
  clip?: string | null;
  chapter?: string | null;
  official_clip?: string | null;
  playlist?: string | null;
  playlistItem?: string | null;
  sort?: string | null;
  autoplay?: boolean;
  startSeconds?: number;
  playIdText?: string | null;
  showChapterMarkers?: boolean;
  origin?: string;
};

export function buildEmbedBuilderUrlPath(input: EmbedBuilderUrlInput = {}): string {
  const params = new URLSearchParams();

  if (input.type !== null && input.type !== undefined) {
    params.set('type', input.type);
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

  if (input.autoplay === true) {
    params.set('autoplay', 'true');
  }

  const startSeconds = input.startSeconds ?? 0;
  if (startSeconds > 0) {
    params.set('t', String(startSeconds));
  }

  if (input.playIdText) {
    params.set('play_id_text', input.playIdText);
  }

  if (input.showChapterMarkers === false) {
    params.set('chapter_markers', '0');
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
    type: params.type,
    channel: params.channel,
    medium_id: params.mediumId,
    item: params.item,
    clip: params.clip,
    chapter: params.itemChapter,
    official_clip: params.itemSoundbite,
    playlist: params.playlist,
    playlistItem: params.playlistItem,
    sort: params.sort,
    autoplay: params.autoplay,
    startSeconds: params.startSeconds,
    playIdText: params.playIdText,
    showChapterMarkers: params.showChapterMarkers,
  };
}
