import type { QueryParamsLiveItemType } from '@podverse/helpers-requests';

type LivestreamDropdownConfigParams = {
  type: QueryParamsLiveItemType;
};

export type LivestreamDropdownConfigCurrentParams = {
  currentType: QueryParamsLiveItemType;
};

export function getLivestreamFilterParams({
  type,
}: LivestreamDropdownConfigParams): LivestreamDropdownConfigCurrentParams {
  const currentType = type;

  return { currentType };
}
