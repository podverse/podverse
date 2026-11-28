import { normalizePlaylistTagName } from '@podverse/helpers/playlistTag';
import type { QueryParamsPlaylists } from '@podverse/helpers-requests';

import type { BrowseRangeOption, BrowseSortOption } from './browseTypes';
import { browseSortToApiRange } from './browseTypes';

/**
 * The folded tag a Browse playlists request sends, or `null` when there is nothing to send.
 */
export const appliedBrowsePlaylistTag = (raw: string | null): string | null => {
  if (raw === null) {
    return null;
  }

  const folded = normalizePlaylistTagName(raw);
  if (!folded.ok) {
    return null;
  }

  return folded.name;
};

/**
 * Arguments for the public Browse playlists list. `tag` is omitted when no name applies.
 */
export const browsePlaylistListParams = (input: {
  page: number;
  range: BrowseRangeOption;
  sort: BrowseSortOption;
  tag: string | null;
}): QueryParamsPlaylists => {
  const params: QueryParamsPlaylists = {
    medium: 'all',
    page: input.page,
    range: browseSortToApiRange(input.sort, input.range),
    sort: input.sort,
    type: 'public',
  };
  const tag = appliedBrowsePlaylistTag(input.tag);
  if (tag !== null) {
    params.tag = tag;
  }
  return params;
};
