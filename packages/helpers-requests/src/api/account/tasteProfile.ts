import type {
  DTOAccountRecommendation,
  DTOAccountTasteProfileHiddenList,
  DTOAccountTasteProfileList,
  DTOAccountTasteProfileShowState,
  RecommendationChip,
} from '@podverse/helpers';

import type { ApiRequestService } from '../_request.js';

function tasteProfileQuery(params: { page?: number; limit?: number }): string {
  const query = new URLSearchParams();
  if (params.page !== undefined) {
    query.set('page', String(params.page));
  }
  if (params.limit !== undefined) {
    query.set('limit', String(params.limit));
  }
  const queryString = query.toString();
  return queryString === '' ? '' : `?${queryString}`;
}

export const reqAccountTasteProfile = (
  api: ApiRequestService,
  params: { page?: number; limit?: number }
): Promise<DTOAccountTasteProfileList> => {
  return api
    .apiRequest<{ data: DTOAccountTasteProfileList }>({
      path: `/account/taste-profile${tasteProfileQuery(params)}`,
      method: 'GET',
      config: {
        withCredentials: true,
      },
    })
    .then((response) => response.data);
};

export const reqAccountTasteProfileHidden = (
  api: ApiRequestService,
  params: { page?: number; limit?: number }
): Promise<DTOAccountTasteProfileHiddenList> => {
  return api
    .apiRequest<{ data: DTOAccountTasteProfileHiddenList }>({
      path: `/account/taste-profile/hidden${tasteProfileQuery(params)}`,
      method: 'GET',
      config: {
        withCredentials: true,
      },
    })
    .then((response) => response.data);
};

export const reqAccountTasteProfileHide = (
  api: ApiRequestService,
  params: { channel_id_text: string }
): Promise<DTOAccountTasteProfileShowState> => {
  return api
    .apiRequest<{ data: DTOAccountTasteProfileShowState }>({
      path: '/account/taste-profile/hide',
      method: 'POST',
      data: params,
      config: {
        withCredentials: true,
      },
    })
    .then((response) => response.data);
};

export const reqAccountTasteProfileUnhide = (
  api: ApiRequestService,
  params: { channel_id_text: string; add_to_taste_profile: boolean }
): Promise<DTOAccountTasteProfileShowState> => {
  return api
    .apiRequest<{ data: DTOAccountTasteProfileShowState }>({
      path: '/account/taste-profile/unhide',
      method: 'POST',
      data: params,
      config: {
        withCredentials: true,
      },
    })
    .then((response) => response.data);
};

export const reqAccountRecommendations = (
  api: ApiRequestService,
  params: { chip: RecommendationChip }
): Promise<DTOAccountRecommendation[]> => {
  const query = new URLSearchParams();
  query.set('chip', params.chip);
  return api
    .apiRequest<{ data: { items: DTOAccountRecommendation[] } }>({
      path: `/account/recommendations?${query.toString()}`,
      method: 'GET',
      config: {
        withCredentials: true,
      },
    })
    .then((response) => response.data.items);
};

export const reqAccountChannelHidden = (
  api: ApiRequestService,
  params: { page?: number; limit?: number }
): Promise<DTOAccountTasteProfileHiddenList> => {
  return api
    .apiRequest<{ data: DTOAccountTasteProfileHiddenList }>({
      path: `/account/channel-hidden${tasteProfileQuery(params)}`,
      method: 'GET',
      config: {
        withCredentials: true,
      },
    })
    .then((response) => response.data);
};

export const reqAccountChannelHiddenHide = (
  api: ApiRequestService,
  params: { channel_id_text: string }
): Promise<{ channel_id_text: string; hidden: boolean }> => {
  return api
    .apiRequest<{ data: { channel_id_text: string; hidden: boolean } }>({
      path: '/account/channel-hidden/hide',
      method: 'POST',
      data: params,
      config: {
        withCredentials: true,
      },
    })
    .then((response) => response.data);
};

export const reqAccountChannelHiddenUnhide = (
  api: ApiRequestService,
  params: { channel_id_text: string }
): Promise<{ channel_id_text: string; hidden: boolean }> => {
  return api
    .apiRequest<{ data: { channel_id_text: string; hidden: boolean } }>({
      path: '/account/channel-hidden/unhide',
      method: 'POST',
      data: params,
      config: {
        withCredentials: true,
      },
    })
    .then((response) => response.data);
};

export const reqAccountTasteProfileSetWeight = (
  api: ApiRequestService,
  params: { channel_id_text: string; weight: number }
): Promise<{ channel_id_text: string; weight: number }> => {
  return api
    .apiRequest<{ data: { channel_id_text: string; weight: number } }>({
      path: '/account/taste-profile/weight',
      method: 'POST',
      data: params,
      config: {
        withCredentials: true,
      },
    })
    .then((response) => response.data);
};
