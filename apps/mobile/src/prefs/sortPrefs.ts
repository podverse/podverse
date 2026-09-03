import AsyncStorage from '@react-native-async-storage/async-storage';

import type { SortPrefScope, SortPrefValue } from '@podverse/helpers';
import {
  buildSortPrefScopeKey,
  mergeSortPrefValue,
  sanitizeSortPrefValue,
} from '@podverse/helpers';

/**
 * Remembered filter and sort selections, keyed per screen instance.
 *
 * Separate from `prefsStore` because the keys are open-ended: one entry per channel, item, and
 * playlist the user has expressed an opinion about, whereas `prefsStore` is a closed union of named
 * settings with per-key types. Entries are unbounded — AsyncStorage has no meaningful size pressure
 * here, and evicting somebody's sort to save a few hundred bytes would be a worse trade than the
 * cookie budget forces on web.
 *
 * Device-local by design. Nothing here reaches the server, and a phone and a laptop may
 * legitimately disagree about how a list is ordered.
 */

/**
 * Namespace so a scope key can never collide with a `prefsStore` key. `podcasts` alone would sit
 * beside `locale` in the same flat AsyncStorage keyspace.
 */
const STORAGE_PREFIX = 'sort.';

type Listener = () => void;

const listenersByScopeKey = new Map<string, Set<Listener>>();

const notify = (scopeKey: string): void => {
  for (const listener of listenersByScopeKey.get(scopeKey) ?? []) {
    listener();
  }
};

const readByScopeKey = async (scopeKey: string): Promise<SortPrefValue | null> => {
  const stored = await AsyncStorage.getItem(`${STORAGE_PREFIX}${scopeKey}`);
  if (stored === null) {
    return null;
  }

  try {
    return sanitizeSortPrefValue(JSON.parse(stored));
  } catch {
    // Unparseable storage reads as no preference. The screen has a documented default and the next
    // write replaces the row, so there is nothing to repair and nothing worth telling the user.
    return null;
  }
};

/** The remembered selections for a screen, or `null` when it has none. */
export const readSortPref = async (scope: SortPrefScope): Promise<SortPrefValue | null> => {
  const scopeKey = buildSortPrefScopeKey(scope);
  if (scopeKey === null) {
    return null;
  }
  return readByScopeKey(scopeKey);
};

/**
 * Fold a selection into what this screen already remembers, then tell anyone listening.
 *
 * The notification is what lets a control on one screen change a list on another without either
 * holding a copy of the value: the preference is the single source, and readers re-read it.
 */
export const writeSortPref = async (scope: SortPrefScope, patch: SortPrefValue): Promise<void> => {
  const scopeKey = buildSortPrefScopeKey(scope);
  if (scopeKey === null) {
    return;
  }

  const merged = mergeSortPrefValue(await readByScopeKey(scopeKey), patch);
  const storageKey = `${STORAGE_PREFIX}${scopeKey}`;

  if (merged === null) {
    await AsyncStorage.removeItem(storageKey);
  } else {
    await AsyncStorage.setItem(storageKey, JSON.stringify(merged));
  }

  notify(scopeKey);
};

/** Watch one screen's preference. Returns the unsubscribe function. */
export const subscribeSortPref = (scope: SortPrefScope, listener: Listener): (() => void) => {
  const scopeKey = buildSortPrefScopeKey(scope);
  if (scopeKey === null) {
    return () => undefined;
  }

  const listeners = listenersByScopeKey.get(scopeKey) ?? new Set<Listener>();
  listeners.add(listener);
  listenersByScopeKey.set(scopeKey, listeners);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      listenersByScopeKey.delete(scopeKey);
    }
  };
};

export type { SortPrefScope, SortPrefValue } from '@podverse/helpers';
