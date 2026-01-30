import { QueryParamsChannelMusicArtistType } from '@podverse/helpers-requests';

type ArtistDropdownConfigParams = {
  type: QueryParamsChannelMusicArtistType;
};

export type ArtistDropdownConfigCurrentParams = {
  currentType: QueryParamsChannelMusicArtistType;
};

export function getArtistFilterParams({
  type,
}: ArtistDropdownConfigParams): ArtistDropdownConfigCurrentParams {
  const currentType = type;
  return { currentType };
}
