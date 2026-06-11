import { buildEmbedUrl, buildEmbedUrlPath } from './buildEmbedUrl';
import {
  buildEmbedUrlEntityContextFromBuilderParams,
  resolveEmbedPlayIdTextFromBuilderParams,
} from './buildEmbedUrlEntityContext';
import type { EmbedBuilderQueryParams } from './embedBuilderTypes';
import { resolveEmbedBuilderPresentation } from './resolveEmbedBuilderPresentation';

export function buildEmbedUrlFromBuilderParams(
  params: EmbedBuilderQueryParams,
  options?: { origin?: string }
): string | null {
  const { layout, presentation } = resolveEmbedBuilderPresentation(params.type);
  const context = buildEmbedUrlEntityContextFromBuilderParams(params, layout);

  return buildEmbedUrl(context, {
    layout,
    autoplay: params.autoplay,
    startSeconds: params.startSeconds,
    playIdText: resolveEmbedPlayIdTextFromBuilderParams(params),
    chapterMarkers: params.showChapterMarkers,
    presentation,
    sort: params.sort,
    origin: options?.origin,
  });
}

export function buildEmbedUrlPathFromBuilderParams(params: EmbedBuilderQueryParams): string | null {
  const { layout, presentation } = resolveEmbedBuilderPresentation(params.type);
  const context = buildEmbedUrlEntityContextFromBuilderParams(params, layout);

  return buildEmbedUrlPath(context, {
    layout,
    autoplay: params.autoplay,
    startSeconds: params.startSeconds,
    playIdText: resolveEmbedPlayIdTextFromBuilderParams(params),
    chapterMarkers: params.showChapterMarkers,
    presentation,
    sort: params.sort,
  });
}
