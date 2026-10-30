import { describe, expect, it } from 'vitest';

import {
  QUERY_PARAMS_GLOBAL_SORT_VALUES,
  QUERY_PARAMS_SUBSCRIBED_FULL_SORT,
} from '@podverse/helpers-requests';

import { buildSubscribedListFilterParams } from './dropdownMenuItems.js';

describe('buildSubscribedListFilterParams', () => {
  const base = {
    page: 2,
    range: 'week' as const,
    sort: 'top' as const,
  };

  it('forces category type when category is set (supportsCategory)', () => {
    const out = buildSubscribedListFilterParams({
      ...base,
      category: 'technology',
      defaultGlobalSort: 'recent',
      defaultSubscribedSort: 'a_z',
      globalSortValues: QUERY_PARAMS_GLOBAL_SORT_VALUES,
      isValidAuthSession: true,
      subscribedSortValues: QUERY_PARAMS_SUBSCRIBED_FULL_SORT,
      supportsCategory: true,
      type: 'global',
    });
    expect(out.currentType).toBe('category');
    expect(out.currentCategory).toBe('technology');
    expect(out.currentSort).toBe('top');
  });

  it('preserves subscribed branch when type is subscribed', () => {
    const out = buildSubscribedListFilterParams({
      ...base,
      category: null,
      defaultGlobalSort: 'recent',
      defaultSubscribedSort: 'a_z',
      globalSortValues: QUERY_PARAMS_GLOBAL_SORT_VALUES,
      isValidAuthSession: true,
      subscribedSortValues: QUERY_PARAMS_SUBSCRIBED_FULL_SORT,
      supportsCategory: true,
      type: 'subscribed',
    });
    expect(out.currentType).toBe('subscribed');
    expect(out.currentSort).toBe('top');
  });

  it('defaults to subscribed when auth and type is unset, else global when logged out', () => {
    const auth = buildSubscribedListFilterParams({
      ...base,
      defaultGlobalSort: 'recent',
      defaultSubscribedSort: 'a_z',
      globalSortValues: QUERY_PARAMS_GLOBAL_SORT_VALUES,
      isValidAuthSession: true,
      subscribedSortValues: QUERY_PARAMS_SUBSCRIBED_FULL_SORT,
      supportsCategory: false,
      type: null,
    });
    expect(auth.currentType).toBe('subscribed');
    expect(auth.currentPage).toBe(1);
    expect(auth.currentRange).toBe(null);

    const guest = buildSubscribedListFilterParams({
      ...base,
      defaultGlobalSort: 'recent',
      defaultSubscribedSort: 'a_z',
      globalSortValues: QUERY_PARAMS_GLOBAL_SORT_VALUES,
      isValidAuthSession: false,
      subscribedSortValues: QUERY_PARAMS_SUBSCRIBED_FULL_SORT,
      supportsCategory: false,
      type: null,
    });
    expect(guest.currentType).toBe('global');
    expect(guest.currentPage).toBe(1);
    expect(guest.currentRange).toBe('week');
  });
});

describe('scope', () => {
  const base = {
    page: 2,
    range: 'week' as const,
    sort: 'top' as const,
  };

  const topWeek = {
    defaultGlobalSort: 'top' as const,
    defaultSubscribedSort: 'a_z' as const,
    globalSortValues: QUERY_PARAMS_GLOBAL_SORT_VALUES,
    page: 1,
    subscribedSortValues: QUERY_PARAMS_SUBSCRIBED_FULL_SORT,
  };

  it('keeps type subscribed when scope is subscribed, even without a session', () => {
    const out = buildSubscribedListFilterParams({
      ...base,
      defaultGlobalSort: 'recent',
      defaultSubscribedSort: 'a_z',
      globalSortValues: QUERY_PARAMS_GLOBAL_SORT_VALUES,
      isValidAuthSession: false,
      scope: 'subscribed',
      subscribedSortValues: QUERY_PARAMS_SUBSCRIBED_FULL_SORT,
      supportsCategory: false,
      type: null,
    });
    expect(out.currentType).toBe('subscribed');
  });

  it('treats a subscribed type as global when scope is browse', () => {
    const out = buildSubscribedListFilterParams({
      ...base,
      defaultGlobalSort: 'recent',
      defaultSubscribedSort: 'a_z',
      globalSortValues: QUERY_PARAMS_GLOBAL_SORT_VALUES,
      isValidAuthSession: true,
      scope: 'browse',
      subscribedSortValues: QUERY_PARAMS_SUBSCRIBED_FULL_SORT,
      supportsCategory: false,
      type: 'subscribed',
    });
    expect(out.currentType).toBe('global');
    expect(out.currentSort).toBe('recent');
  });

  it('opens a signed-out browse list on Top for the week when no sort or range is set', () => {
    const out = buildSubscribedListFilterParams({
      ...topWeek,
      isValidAuthSession: false,
      range: null,
      scope: 'browse',
      sort: null,
      supportsCategory: false,
      type: 'global',
    });
    expect(out.currentType).toBe('global');
    expect(out.currentSort).toBe('top');
    expect(out.currentRange).toBe('week');
  });

  it('opens a signed-in browse list on Top for the week when the type is subscribed', () => {
    const out = buildSubscribedListFilterParams({
      ...topWeek,
      isValidAuthSession: true,
      range: null,
      scope: 'browse',
      sort: 'a_z',
      supportsCategory: false,
      type: 'subscribed',
    });
    expect(out.currentType).toBe('global');
    expect(out.currentSort).toBe('top');
    expect(out.currentRange).toBe('week');
  });

  it('opens a browse category list on Top for the week', () => {
    const out = buildSubscribedListFilterParams({
      ...topWeek,
      category: 'technology',
      isValidAuthSession: false,
      range: null,
      scope: 'browse',
      sort: null,
      supportsCategory: true,
      type: 'global',
    });
    expect(out.currentType).toBe('category');
    expect(out.currentSort).toBe('top');
    expect(out.currentRange).toBe('week');
  });

  it('keeps a chosen range and a chosen Recent sort on a browse list', () => {
    const month = buildSubscribedListFilterParams({
      ...topWeek,
      isValidAuthSession: false,
      range: 'month',
      scope: 'browse',
      sort: 'top',
      supportsCategory: false,
      type: 'global',
    });
    expect(month.currentSort).toBe('top');
    expect(month.currentRange).toBe('month');

    const recent = buildSubscribedListFilterParams({
      ...topWeek,
      isValidAuthSession: false,
      range: null,
      scope: 'browse',
      sort: 'recent',
      supportsCategory: false,
      type: 'global',
    });
    expect(recent.currentSort).toBe('recent');
    expect(recent.currentRange).toBe(null);
  });

  it('leaves a subscribed Top list without a range', () => {
    const out = buildSubscribedListFilterParams({
      ...topWeek,
      isValidAuthSession: true,
      range: null,
      scope: 'subscribed',
      sort: 'top',
      supportsCategory: false,
      type: 'subscribed',
    });
    expect(out.currentType).toBe('subscribed');
    expect(out.currentSort).toBe('top');
    expect(out.currentRange).toBe(null);
  });
});
