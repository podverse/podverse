import { describe, expect, it } from 'vitest';

import { buildPodcastsPagePath, selectFilteredSubscribedPage } from './podcastsFilter';

const channels = (titles: (string | null)[]): { title: string | null }[] =>
  titles.map((title) => ({ title }));

const pathParams = (overrides: Partial<Parameters<typeof buildPodcastsPagePath>[0]> = {}) => ({
  category: null,
  filterTerm: '',
  range: null,
  sort: 'a_z' as const,
  type: 'subscribed' as const,
  ...overrides,
});

describe('buildPodcastsPagePath', () => {
  it('drops the query string when nothing is set', () => {
    expect(buildPodcastsPagePath(pathParams())).toBe('/podcasts');
  });

  it('names the list a filtered link filtered', () => {
    expect(buildPodcastsPagePath(pathParams({ filterTerm: 'daily' }))).toBe(
      '/podcasts?type=subscribed&sort=a_z&filter=daily'
    );
  });

  it('carries the range when the list is sorted by top', () => {
    expect(
      buildPodcastsPagePath(pathParams({ filterTerm: 'daily', range: 'week', sort: 'top' }))
    ).toBe('/podcasts?type=subscribed&sort=top&range=week&filter=daily');
  });

  it('keeps the category and the filter term together', () => {
    expect(buildPodcastsPagePath(pathParams({ category: 'news', filterTerm: 'daily' }))).toBe(
      '/podcasts?category=news&type=subscribed&sort=a_z&filter=daily'
    );
  });

  it('leaves an unfiltered URL as bare as it has always been', () => {
    expect(buildPodcastsPagePath(pathParams({ category: 'news' }))).toBe('/podcasts?category=news');
  });

  it('omits a term that is only whitespace, and trims the one it keeps', () => {
    expect(buildPodcastsPagePath(pathParams({ filterTerm: '   ' }))).toBe('/podcasts');
    expect(buildPodcastsPagePath(pathParams({ filterTerm: '  daily  ' }))).toBe(
      '/podcasts?type=subscribed&sort=a_z&filter=daily'
    );
  });

  it('encodes a term that would otherwise break the query string', () => {
    expect(buildPodcastsPagePath(pathParams({ filterTerm: 'rock & roll' }))).toBe(
      '/podcasts?type=subscribed&sort=a_z&filter=rock+%26+roll'
    );
  });
});

describe('selectFilteredSubscribedPage', () => {
  it('returns everything when the term is empty', () => {
    const result = selectFilteredSubscribedPage({
      channels: channels(['Alpha', 'Beta']),
      page: 1,
      pageSize: 10,
      term: '',
    });

    expect(result.matchCount).toBe(2);
    expect(result.totalPages).toBe(1);
  });

  it('matches across the whole list rather than the page being shown', () => {
    const list = channels(['Alpha', 'Beta', 'Gamma', 'Alpha Two']);

    const result = selectFilteredSubscribedPage({
      channels: list,
      page: 1,
      pageSize: 2,
      term: 'alpha',
    });

    expect(result.channels.map((c) => c.title)).toEqual(['Alpha', 'Alpha Two']);
    expect(result.matchCount).toBe(2);
  });

  it('paginates the matches, not the subscriptions', () => {
    const list = channels(['Show A', 'Other', 'Show B', 'Other Two', 'Show C']);

    const first = selectFilteredSubscribedPage({
      channels: list,
      page: 1,
      pageSize: 2,
      term: 'show',
    });
    const second = selectFilteredSubscribedPage({
      channels: list,
      page: 2,
      pageSize: 2,
      term: 'show',
    });

    expect(first.channels.map((c) => c.title)).toEqual(['Show A', 'Show B']);
    expect(second.channels.map((c) => c.title)).toEqual(['Show C']);
    expect(second.totalPages).toBe(2);
  });

  it('clamps a page past the end of the filtered results', () => {
    const result = selectFilteredSubscribedPage({
      channels: channels(['Alpha', 'Beta', 'Gamma']),
      page: 4,
      pageSize: 2,
      term: 'a',
    });

    expect(result.page).toBe(2);
    expect(result.channels.map((c) => c.title)).toEqual(['Gamma']);
  });

  it('reports one page and no matches when nothing matches', () => {
    const result = selectFilteredSubscribedPage({
      channels: channels(['Alpha', 'Beta']),
      page: 1,
      pageSize: 10,
      term: 'zebra',
    });

    expect(result.channels).toEqual([]);
    expect(result.matchCount).toBe(0);
    expect(result.totalPages).toBe(1);
  });

  it('treats a channel without a title as unmatchable rather than throwing', () => {
    const result = selectFilteredSubscribedPage({
      channels: channels([null, 'Alpha']),
      page: 1,
      pageSize: 10,
      term: 'alpha',
    });

    expect(result.matchCount).toBe(1);
  });

  it('matches a title the user typed without its leading article', () => {
    const result = selectFilteredSubscribedPage({
      channels: channels(['The Daily', 'Marketplace']),
      page: 1,
      pageSize: 10,
      term: 'daily',
    });

    expect(result.channels.map((c) => c.title)).toEqual(['The Daily']);
  });
});
