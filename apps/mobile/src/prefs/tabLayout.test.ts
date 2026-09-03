import { describe, expect, it } from 'vitest';

import {
  addVisibleTab,
  addVisibleTabAt,
  applyTabBarDrop,
  DEFAULT_VISIBLE_TABS,
  moveVisibleTab,
  overflowTabs,
  parseVisibleTabs,
  removeVisibleTab,
} from './tabLayout';

describe('tabLayout', () => {
  it('uses the default bar when storage is empty or invalid', () => {
    expect(DEFAULT_VISIBLE_TABS).toEqual(['Home', 'Browse', 'Search', 'My Library']);
    expect(parseVisibleTabs(null)).toEqual([...DEFAULT_VISIBLE_TABS]);
    expect(parseVisibleTabs('not-json')).toEqual([...DEFAULT_VISIBLE_TABS]);
    expect(parseVisibleTabs('[]')).toEqual([...DEFAULT_VISIBLE_TABS]);
    expect(parseVisibleTabs('["More"]')).toEqual([...DEFAULT_VISIBLE_TABS]);
  });

  it('keeps a valid unique order and drops unknown ids', () => {
    expect(parseVisibleTabs('["Notifications","Home","Browse","Search","My Library"]')).toEqual([
      'Notifications',
      'Home',
      'Browse',
      'Search',
    ]);
    expect(parseVisibleTabs('["Home","Home","Wizard"]')).toEqual(['Home']);
  });

  it('treats tabs not on the bar as More overflow', () => {
    expect(overflowTabs([...DEFAULT_VISIBLE_TABS])).toEqual(['Notifications']);
  });

  it('reorders, adds (replacing the last when full), and refuses to empty the bar', () => {
    expect(moveVisibleTab(['Home', 'Search', 'Browse'], 2, -1)).toEqual([
      'Home',
      'Browse',
      'Search',
    ]);
    expect(addVisibleTab([...DEFAULT_VISIBLE_TABS], 'Notifications')).toEqual([
      'Home',
      'Browse',
      'Search',
      'Notifications',
    ]);
    expect(removeVisibleTab(['Home'], 'Home')).toEqual(['Home']);
    expect(removeVisibleTab(['Home', 'Search'], 'Search')).toEqual(['Home']);
  });

  it('inserts a tab at an index and drops the last other tab when the bar is full', () => {
    expect(addVisibleTabAt([...DEFAULT_VISIBLE_TABS], 'Notifications', 0)).toEqual([
      'Notifications',
      'Home',
      'Browse',
      'Search',
    ]);
  });

  it('applies a drop across sections without emptying the bar', () => {
    expect(
      applyTabBarDrop([...DEFAULT_VISIBLE_TABS], {
        fromIndex: 3,
        fromSection: 'visible',
        id: 'My Library',
        toIndex: 0,
        toSection: 'overflow',
      })
    ).toEqual(['Home', 'Browse', 'Search']);
    expect(
      applyTabBarDrop(['Home'], {
        fromIndex: 0,
        fromSection: 'visible',
        id: 'Home',
        toIndex: 0,
        toSection: 'overflow',
      })
    ).toEqual(['Home']);
    expect(
      applyTabBarDrop(['Home', 'Search', 'Browse'], {
        fromIndex: 0,
        fromSection: 'overflow',
        id: 'Notifications',
        toIndex: 1,
        toSection: 'visible',
      })
    ).toEqual(['Home', 'Notifications', 'Search', 'Browse']);
  });
});
