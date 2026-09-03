import type { DTOChannel } from '@podverse/helpers';
import { matchesTitleFilter } from '@podverse/helpers';
import type {
  QueryParamsStatsRange,
  QueryParamsSubscribedFullSort,
  QueryParamsSubscribedType,
} from '@podverse/helpers-requests';

import { ROUTES } from '../../constants/routes';

export const PODCASTS_FILTER_QUERY_PARAM = 'filter';

/**
 * Far longer than any podcast title, short enough that a hand-written URL cannot load the page with
 * an absurd string in the input.
 */
export const PODCASTS_FILTER_MAX_LENGTH = 200;

export const clampFilterTerm = (term: string | null | undefined): string => {
  return (term ?? '').slice(0, PODCASTS_FILTER_MAX_LENGTH);
};

interface PodcastsPagePathParams {
  category: string | null;
  filterTerm: string;
  range: QueryParamsStatsRange | null;
  sort: QueryParamsSubscribedFullSort;
  type: QueryParamsSubscribedType;
}

/**
 * The `/podcasts` URL for the list currently on screen.
 *
 * One place decides what belongs in the query string, so writing a filter term cannot drop the
 * category and clearing a category cannot drop the term.
 *
 * A filtered URL also names the list it narrowed. Without that, opening the link in a browser whose
 * saved default is the global list would apply the term to results it was never meant for.
 * Unfiltered URLs are left as bare as they have always been, with the list restored from the
 * viewer's own saved defaults.
 */
export const buildPodcastsPagePath = ({
  category,
  filterTerm,
  range,
  sort,
  type,
}: PodcastsPagePathParams): string => {
  const search = new URLSearchParams();

  if (category !== null && category !== '') {
    search.set('category', category);
  }

  const trimmed = filterTerm.trim();
  if (trimmed !== '') {
    search.set('type', type);
    search.set('sort', sort);
    if (range !== null) {
      search.set('range', range);
    }
    search.set(PODCASTS_FILTER_QUERY_PARAM, trimmed);
  }

  const query = search.toString();
  return query === '' ? ROUTES.PODCASTS : `${ROUTES.PODCASTS}?${query}`;
};

/** Anything with a title can be narrowed, which keeps the tests free of full channel fixtures. */
type TitledChannel = Pick<DTOChannel, 'title'>;

interface FilteredSubscribedPageParams<T extends TitledChannel> {
  channels: readonly T[];
  page: number;
  pageSize: number;
  term: string;
}

export interface FilteredSubscribedPage<T extends TitledChannel> {
  /** The slice to render. */
  channels: T[];
  /** Matches across the whole subscribed list, not just this slice — what the user is told. */
  matchCount: number;
  /** The page actually being shown, which may differ from what was asked for. */
  page: number;
  totalPages: number;
}

/**
 * One page of the subscribed list narrowed to a filter term.
 *
 * Paginates the matches rather than the subscriptions, so page 2 of a filtered list is the second
 * page of results and not the leftovers of the second page of subscriptions. Page size matches what
 * the server would have returned, so the list does not change length when a filter is cleared.
 *
 * A page beyond the last one is clamped instead of rendering empty: narrowing while on page 4 is
 * ordinary, and answering with a blank list would read as the filter having found nothing.
 */
export const selectFilteredSubscribedPage = <T extends TitledChannel>({
  channels,
  page,
  pageSize,
  term,
}: FilteredSubscribedPageParams<T>): FilteredSubscribedPage<T> => {
  const matched = channels.filter((channel) => matchesTitleFilter(channel.title ?? '', term));
  const totalPages = Math.max(1, Math.ceil(matched.length / pageSize));
  const clampedPage = Math.min(Math.max(1, page), totalPages);
  const start = (clampedPage - 1) * pageSize;

  return {
    channels: matched.slice(start, start + pageSize),
    matchCount: matched.length,
    page: clampedPage,
    totalPages,
  };
};
