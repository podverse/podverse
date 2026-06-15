import type { QueryParamsStatsRange } from '@podverse/helpers-requests';

import type { EmbedUrlOptions } from './buildEmbedUrl';
import { EMBED_BUILDER_LIST_DEFAULT_SORT_BY_CONTENT } from './embedBuilderTypes';
import type { EmbedBuilderQueryParams } from './embedBuilderTypes';

/**
 * Maps builder list params to the embed URL options that drive route selection and list query
 * params.
 *
 * - `listContentType` is always returned so the URL builder can pick the right route (e.g.
 *   `episode-chapters`) and emit `type=clips` where needed.
 * - `listSort` / `sort` are omitted (null) when the chosen sort is the content type's default, so
 *   default lists produce clean URLs.
 * - `listRange` is only set for the `top` (popularity) sort.
 */
export function resolveEmbedListUrlOptionsFromBuilderParams(
  params: EmbedBuilderQueryParams
): Pick<EmbedUrlOptions, 'listContentType' | 'listSort' | 'listRange' | 'sort'> {
  const contentType = params.listContentType;
  const sort = params.listSort;
  const isTopSort = sort === 'top';
  const isDefaultSort = sort === EMBED_BUILDER_LIST_DEFAULT_SORT_BY_CONTENT[contentType];

  const listSort = isDefaultSort ? null : sort;
  const listRange: QueryParamsStatsRange | null = isTopSort
    ? (params.listRange ?? 'all-time')
    : null;

  return {
    listContentType: contentType,
    listSort,
    listRange,
    sort: listSort,
  };
}
