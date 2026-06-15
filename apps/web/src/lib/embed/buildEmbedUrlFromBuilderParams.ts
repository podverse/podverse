import { buildEmbedUrl, buildEmbedUrlPath } from './buildEmbedUrl';
import {
  buildEmbedUrlEntityContextFromBuilderParams,
  resolveEmbedPlayIdTextFromBuilderParams,
} from './buildEmbedUrlEntityContext';
import type { EmbedBuilderQueryParams } from './embedBuilderTypes';
import { resolveEmbedBuilderPresentation } from './resolveEmbedBuilderPresentation';
import { resolveEmbedListUrlOptionsFromBuilderParams } from './resolveEmbedListUrlOptionsFromBuilderParams';

export function buildEmbedUrlFromBuilderParams(
  params: EmbedBuilderQueryParams,
  options?: { origin?: string }
): string | null {
  const { layout, playerSize } = resolveEmbedBuilderPresentation(params.type);
  const context = buildEmbedUrlEntityContextFromBuilderParams(params, layout);
  const listUrlOptions = resolveEmbedListUrlOptionsFromBuilderParams(params);

  return buildEmbedUrl(context, {
    layout,
    startSeconds: params.startSeconds,
    playIdText: resolveEmbedPlayIdTextFromBuilderParams(params),
    chapterMarkers: params.showChapterMarkers,
    aspectRatio: params.aspectRatio,
    presentation: params.mediaPreference,
    playerSize,
    ...listUrlOptions,
    listVisibleRows: params.listVisibleRows,
    autoResize: layout === 'list' && playerSize === 'tall' ? params.autoResize : false,
    origin: options?.origin,
  });
}

export function buildEmbedUrlPathFromBuilderParams(params: EmbedBuilderQueryParams): string | null {
  const { layout, playerSize } = resolveEmbedBuilderPresentation(params.type);
  const context = buildEmbedUrlEntityContextFromBuilderParams(params, layout);
  const listUrlOptions = resolveEmbedListUrlOptionsFromBuilderParams(params);

  return buildEmbedUrlPath(context, {
    layout,
    startSeconds: params.startSeconds,
    playIdText: resolveEmbedPlayIdTextFromBuilderParams(params),
    chapterMarkers: params.showChapterMarkers,
    aspectRatio: params.aspectRatio,
    presentation: params.mediaPreference,
    playerSize,
    ...listUrlOptions,
    listVisibleRows: params.listVisibleRows,
    autoResize: layout === 'list' && playerSize === 'tall' ? params.autoResize : false,
  });
}
