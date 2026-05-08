import { describe, expect, it } from 'vitest';

import {
  QUERY_PARAMS_GLOBAL_SORT_VALUES,
  QUERY_PARAMS_SUBSCRIBED_FULL_SORT,
} from '@podverse/helpers-requests';

import {
  buildSubscribedListDropdownConfig,
  buildSubscribedListFilterParams,
} from './dropdownMenuItems.js';

const tFilters = (key: string) => key;

describe('buildSubscribedListDropdownConfig', () => {
  it('uses global vs subscribed sort menus for the two-type variant', () => {
    const global = buildSubscribedListDropdownConfig({
      globalSorts: [
        { label: 'recent', value: 'recent' },
        { label: 'top', value: 'top' },
      ],
      showRangeWhenSort: 'top',
      sort: 'recent',
      subscribedSorts: [
        { label: 'a_z', value: 'a_z' },
        { label: 'recent', value: 'recent' },
      ],
      tFilters,
      type: 'global',
      typeOptions: [
        { label: 'global', value: 'global' },
        { label: 'subscribed', value: 'subscribed' },
      ],
    });
    expect(global.sortMenuItems.map((i) => i.value)).toEqual(['recent', 'top']);

    const subscribed = buildSubscribedListDropdownConfig({
      globalSorts: [
        { label: 'recent', value: 'recent' },
        { label: 'top', value: 'top' },
      ],
      showRangeWhenSort: 'top',
      sort: 'recent',
      subscribedSorts: [
        { label: 'a_z', value: 'a_z' },
        { label: 'recent', value: 'recent' },
      ],
      tFilters,
      type: 'subscribed',
      typeOptions: [
        { label: 'global', value: 'global' },
        { label: 'subscribed', value: 'subscribed' },
      ],
    });
    expect(subscribed.sortMenuItems.map((i) => i.value)).toEqual(['a_z', 'recent']);
  });

  it('uses category sorts when type is category and categorySorts is provided', () => {
    const cfg = buildSubscribedListDropdownConfig({
      categorySorts: [
        { label: 'recent', value: 'recent' },
        { label: 'top', value: 'top' },
      ],
      globalSorts: [{ label: 'recent', value: 'recent' }],
      showRangeWhenSort: 'top',
      sort: 'recent',
      subscribedSorts: [{ label: 'recent', value: 'recent' }],
      tFilters,
      type: 'category',
      typeOptions: [
        { label: 'global', value: 'global' },
        { label: 'subscribed', value: 'subscribed' },
        { label: 'category', value: 'category' },
      ],
    });
    expect(cfg.sortMenuItems.map((i) => i.value)).toEqual(['recent', 'top']);
  });

  it('toggles showRangeDropdown when sort matches showRangeWhenSort', () => {
    const off = buildSubscribedListDropdownConfig({
      globalSorts: [{ label: 'recent', value: 'recent' }],
      showRangeWhenSort: 'top',
      sort: 'recent',
      subscribedSorts: [{ label: 'recent', value: 'recent' }],
      tFilters,
      type: 'global',
      typeOptions: [
        { label: 'global', value: 'global' },
        { label: 'subscribed', value: 'subscribed' },
      ],
    });
    expect(off.showRangeDropdown).toBe(false);

    const on = buildSubscribedListDropdownConfig({
      globalSorts: [{ label: 'recent', value: 'recent' }],
      showRangeWhenSort: 'top',
      sort: 'top',
      subscribedSorts: [{ label: 'recent', value: 'recent' }],
      tFilters,
      type: 'global',
      typeOptions: [
        { label: 'global', value: 'global' },
        { label: 'subscribed', value: 'subscribed' },
      ],
    });
    expect(on.showRangeDropdown).toBe(true);
  });
});

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
    expect(guest.currentRange).toBe(null);
  });
});
