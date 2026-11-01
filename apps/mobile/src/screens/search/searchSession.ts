import type { QueryParamsPodcastIndexSearchMedium, SearchPodcastsFeed } from '@podverse/helpers';

export type SearchSession = {
  feeds: SearchPodcastsFeed[];
  medium: QueryParamsPodcastIndexSearchMedium;
  query: string;
};

let session: SearchSession | null = null;

export const searchFetchKey = (medium: QueryParamsPodcastIndexSearchMedium, query: string): string =>
  `${medium}\0${query}`;

export const readSearchSession = (): SearchSession | null => session;

/** Drops the session when the query is empty so a cleared field does not come back. */
export const writeSearchSession = (next: SearchSession): void => {
  const query = next.query.trim();
  if (query.length === 0) {
    session = null;
    return;
  }
  session = {
    feeds: next.feeds,
    medium: next.medium,
    query,
  };
};

export const clearSearchSession = (): void => {
  session = null;
};
