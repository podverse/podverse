import type { QueryParamsItemMusicType } from '@podverse/helpers-requests';

type TrackPageDropdownConfigParams = {
  type: QueryParamsItemMusicType;
};

export type TrackPageDropdownConfigCurrentParams = {
  currentType: QueryParamsItemMusicType;
};

export function getTrackPageFilterParams({
  type,
}: TrackPageDropdownConfigParams): TrackPageDropdownConfigCurrentParams {
  const currentType = type;

  return { currentType };
}
