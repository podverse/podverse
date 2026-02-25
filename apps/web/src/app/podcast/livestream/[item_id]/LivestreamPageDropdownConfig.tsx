import type { QueryParamsLiveItemType } from '@podverse/helpers-requests';

type LivestreamPageDropdownConfigParams = {
  type: QueryParamsLiveItemType;
};

export type LivestreamPageDropdownConfigCurrentParams = {
  currentType: QueryParamsLiveItemType;
};

export function getLivestreamPageFilterParams({
  type,
}: LivestreamPageDropdownConfigParams): LivestreamPageDropdownConfigCurrentParams {
  const currentType = type;

  return { currentType };
}
