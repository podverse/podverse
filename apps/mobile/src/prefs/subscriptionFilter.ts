import type { SortPrefScope } from '@podverse/helpers';

import type { SubscriptionListFilter } from './prefsStore';
import { DEFAULT_SUBSCRIPTION_FILTER, getPref } from './prefsStore';
import { readSortPref, writeSortPref } from './sortPrefs';

/**
 * Library's scope chip, held under the same scope-keyed contract as Home's filter and sort.
 *
 * The Library list is one list, so its name is the whole scope — there is no second instance for it
 * to be confused with, unlike a podcast or an episode.
 */
const LIBRARY_SUBSCRIPTIONS_SCOPE: SortPrefScope = { kind: 'list', name: 'library.subscriptions' };

const isSubscriptionListFilter = (value: string): value is SubscriptionListFilter => {
  return value === 'all' || value === 'addByRss';
};

/**
 * The chip this list should open with, default already applied.
 *
 * A device that set the chip before Library used the scope-keyed store keeps that choice: the value
 * is read from where it used to live and written into the scoped entry on that first read, so the
 * carry-over happens once rather than on every launch for the life of the install.
 */
export const readLibrarySubscriptionFilter = async (): Promise<SubscriptionListFilter> => {
  const stored = await readSortPref(LIBRARY_SUBSCRIPTIONS_SCOPE);
  if (stored?.filter !== undefined && isSubscriptionListFilter(stored.filter)) {
    return stored.filter;
  }

  const legacyFilter = await getPref('library.subscriptionFilter');
  if (legacyFilter !== null) {
    await writeSortPref(LIBRARY_SUBSCRIPTIONS_SCOPE, { filter: legacyFilter });
    return legacyFilter;
  }

  return DEFAULT_SUBSCRIPTION_FILTER;
};

export const writeLibrarySubscriptionFilter = async (
  filter: SubscriptionListFilter
): Promise<void> => {
  await writeSortPref(LIBRARY_SUBSCRIPTIONS_SCOPE, { filter });
};

export type { SubscriptionListFilter } from './prefsStore';
export { DEFAULT_SUBSCRIPTION_FILTER };
