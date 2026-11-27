import type {
  DTOPerson,
  DTOPersonAppearance,
  DTOPersonChannel,
  DTOPersonItem,
  DTOPersonRecommendation,
  PersonContentChip,
  StatsPopularityRange,
} from '@podverse/helpers';

import type { ApiRequestService } from './_request.js';

type PageMeta = { page: number; count: number; limit: number };

type PageResult<T> = { data: T[]; meta: PageMeta };

type PersonListParams = {
  page?: number;
  limit?: number;
  q?: string;
  sort?: 'recent' | 'top';
  range?: StatsPopularityRange;
};

function pageQuery(params: PersonListParams): string {
  const query = new URLSearchParams();
  if (params.page !== undefined) {
    query.set('page', String(params.page));
  }
  if (params.limit !== undefined) {
    query.set('limit', String(params.limit));
  }
  if (params.q !== undefined && params.q !== '') {
    query.set('q', params.q);
  }
  if (params.sort !== undefined) {
    query.set('sort', params.sort);
  }
  if (params.range !== undefined) {
    query.set('range', params.range);
  }
  const queryString = query.toString();
  return queryString === '' ? '' : `?${queryString}`;
}

export function reqPersonList(
  api: ApiRequestService,
  params: PersonListParams
): Promise<PageResult<DTOPerson>> {
  return api.apiRequest<PageResult<DTOPerson>>({
    path: `/person${pageQuery(params)}`,
    method: 'GET',
    config: { withCredentials: true },
  });
}

export function reqPersonByIdText(api: ApiRequestService, idText: string): Promise<DTOPerson> {
  return api.apiRequest<DTOPerson>({
    path: `/person/${encodeURIComponent(idText)}`,
    method: 'GET',
    config: { withCredentials: true },
  });
}

export function reqPersonChannels(
  api: ApiRequestService,
  idText: string,
  params: PersonListParams & { chip: 'podcasts' | 'albums' | 'artists' }
): Promise<PageResult<DTOPersonChannel>> {
  const query = pageQuery(params);
  const chip = `chip=${encodeURIComponent(params.chip)}`;
  return api.apiRequest<PageResult<DTOPersonChannel>>({
    path: `/person/${encodeURIComponent(idText)}/channels${query === '' ? `?${chip}` : `${query}&${chip}`}`,
    method: 'GET',
  });
}

export function reqPersonItems(
  api: ApiRequestService,
  idText: string,
  params: PersonListParams & {
    chip: Extract<PersonContentChip, 'episodes' | 'tracks' | 'livestreams'>;
  }
): Promise<PageResult<DTOPersonItem>> {
  const query = pageQuery(params);
  const chip = `chip=${encodeURIComponent(params.chip)}`;
  return api.apiRequest<PageResult<DTOPersonItem>>({
    path: `/person/${encodeURIComponent(idText)}/items${query === '' ? `?${chip}` : `${query}&${chip}`}`,
    method: 'GET',
  });
}

export function reqChannelPersonAppearances(
  api: ApiRequestService,
  channelIdOrIdText: string,
  params: { page?: number; limit?: number }
): Promise<PageResult<DTOPersonAppearance>> {
  return api.apiRequest<PageResult<DTOPersonAppearance>>({
    path: `/channel/${encodeURIComponent(channelIdOrIdText)}/person-appearances${pageQuery(params)}`,
    method: 'GET',
  });
}

export function reqAccountPersonRecommendations(
  api: ApiRequestService
): Promise<DTOPersonRecommendation[]> {
  return api
    .apiRequest<{ data: { items: DTOPersonRecommendation[] } }>({
      path: '/account/recommendations?chip=people',
      method: 'GET',
      config: { withCredentials: true },
    })
    .then((response) => response.data.items);
}
