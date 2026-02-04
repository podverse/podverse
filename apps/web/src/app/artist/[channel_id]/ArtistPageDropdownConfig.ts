import type { QueryParamsChannelMusicArtistType } from '@podverse/helpers-requests';

type ArtistPageDropdownConfigParams = {
  type: QueryParamsChannelMusicArtistType;
};

export type ArtistPageDropdownConfigCurrentParams = {
  currentType: QueryParamsChannelMusicArtistType;
};

export function getArtistPageFilterParams({
  type,
}: ArtistPageDropdownConfigParams): ArtistPageDropdownConfigCurrentParams {
  const currentType = type;
  return { currentType };
}
