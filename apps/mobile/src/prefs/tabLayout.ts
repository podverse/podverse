import AsyncStorage from '@react-native-async-storage/async-storage';

import { moveItem } from '../lib/reorder/moveItem';

/**
 * Device-local tab bar layout. More is always last and is not stored. Hidden content tabs stay
 * registered in the navigator and appear as rows on More.
 */
export const CONTENT_TAB_IDS = ['Home', 'Browse', 'Search', 'My Library', 'Notifications'] as const;

export type ContentTabId = (typeof CONTENT_TAB_IDS)[number];

export const DEFAULT_VISIBLE_TABS: readonly ContentTabId[] = [
  'Home',
  'Browse',
  'Search',
  'My Library',
];

export const MAX_VISIBLE_CONTENT_TABS = 4;

export const TAB_LAYOUT_STORAGE_KEY = 'tabs.visible';

export const TAB_TEST_ID_SLUG: Record<ContentTabId, string> = {
  Browse: 'browse',
  Home: 'home',
  'My Library': 'my-library',
  Notifications: 'notifications',
  Search: 'search',
};

export const isContentTabId = (value: string): value is ContentTabId => {
  return CONTENT_TAB_IDS.some((tabId) => tabId === value);
};

export const tabLabelKey = (tabId: ContentTabId | 'More'): string => {
  if (tabId === 'Home') {
    return 'nav.tab.home';
  }
  if (tabId === 'Search') {
    return 'features.search.search';
  }
  if (tabId === 'My Library') {
    return 'features.my_library';
  }
  if (tabId === 'Browse') {
    return 'nav.tab.browse';
  }
  if (tabId === 'Notifications') {
    return 'nav.tab.notifications';
  }
  return 'nav.tab.more';
};

export const parseVisibleTabs = (raw: string | null): ContentTabId[] => {
  if (raw === null) {
    return [...DEFAULT_VISIBLE_TABS];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [...DEFAULT_VISIBLE_TABS];
    }

    const seen = new Set<ContentTabId>();
    const result: ContentTabId[] = [];
    for (const item of parsed) {
      if (typeof item !== 'string' || !isContentTabId(item) || seen.has(item)) {
        continue;
      }
      seen.add(item);
      result.push(item);
      if (result.length === MAX_VISIBLE_CONTENT_TABS) {
        break;
      }
    }

    return result.length > 0 ? result : [...DEFAULT_VISIBLE_TABS];
  } catch {
    return [...DEFAULT_VISIBLE_TABS];
  }
};

export const overflowTabs = (visible: readonly ContentTabId[]): ContentTabId[] => {
  return CONTENT_TAB_IDS.filter((tabId) => !visible.includes(tabId));
};

export const moveVisibleTab = (
  visible: readonly ContentTabId[],
  index: number,
  direction: -1 | 1
): ContentTabId[] => {
  const next = [...visible];
  const target = index + direction;
  if (index < 0 || index >= next.length || target < 0 || target >= next.length) {
    return next;
  }

  const current = next[index];
  const swap = next[target];
  if (current === undefined || swap === undefined) {
    return next;
  }

  next[index] = swap;
  next[target] = current;
  return next;
};

export const addVisibleTabAt = (
  visible: readonly ContentTabId[],
  tabId: ContentTabId,
  index: number
): ContentTabId[] => {
  if (visible.includes(tabId)) {
    return [...visible];
  }

  const next = [...visible];
  const clamped = Math.min(Math.max(index, 0), next.length);
  next.splice(clamped, 0, tabId);
  if (next.length <= MAX_VISIBLE_CONTENT_TABS) {
    return next;
  }

  for (let i = next.length - 1; i >= 0; i -= 1) {
    if (next[i] !== tabId) {
      next.splice(i, 1);
      break;
    }
  }
  return next;
};

export const addVisibleTab = (
  visible: readonly ContentTabId[],
  tabId: ContentTabId
): ContentTabId[] => {
  return addVisibleTabAt(visible, tabId, visible.length);
};

export type TabBarSectionId = 'overflow' | 'visible';

export const isTabBarSectionId = (value: string): value is TabBarSectionId => {
  return value === 'overflow' || value === 'visible';
};

export const removeVisibleTab = (
  visible: readonly ContentTabId[],
  tabId: ContentTabId
): ContentTabId[] => {
  if (visible.length <= 1) {
    return [...visible];
  }
  return visible.filter((item) => item !== tabId);
};

export const applyTabBarDrop = (
  visible: readonly ContentTabId[],
  event: {
    fromIndex: number;
    fromSection: TabBarSectionId;
    id: ContentTabId;
    toIndex: number;
    toSection: TabBarSectionId;
  }
): ContentTabId[] => {
  if (event.fromSection === 'visible' && event.toSection === 'visible') {
    return moveItem(visible, event.fromIndex, event.toIndex);
  }
  if (event.fromSection === 'overflow' && event.toSection === 'visible') {
    return addVisibleTabAt(visible, event.id, event.toIndex);
  }
  if (event.fromSection === 'visible' && event.toSection === 'overflow') {
    return removeVisibleTab(visible, event.id);
  }
  return [...visible];
};

export const readVisibleTabs = async (): Promise<ContentTabId[]> => {
  const stored = await AsyncStorage.getItem(TAB_LAYOUT_STORAGE_KEY);
  return parseVisibleTabs(stored);
};

export const writeVisibleTabs = async (visible: readonly ContentTabId[]): Promise<void> => {
  const normalized = parseVisibleTabs(JSON.stringify(visible));
  await AsyncStorage.setItem(TAB_LAYOUT_STORAGE_KEY, JSON.stringify(normalized));
};
