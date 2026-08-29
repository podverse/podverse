import type { SubscriptionListFilter } from './prefsStore';
import { DEFAULT_SUBSCRIPTION_FILTER, getPref, setPref } from './prefsStore';

const LIBRARY_SUBSCRIPTION_FILTER_KEY = 'library.subscriptionFilter';

/**
 * Library's scope chip. Home's equivalent is in `homeListPrefs`, held under the scope-keyed
 * contract alongside Home's sort so the two travel together.
 */
export const readLibrarySubscriptionFilter = (): Promise<SubscriptionListFilter | null> => {
  return getPref(LIBRARY_SUBSCRIPTION_FILTER_KEY);
};

export const writeLibrarySubscriptionFilter = (filter: SubscriptionListFilter): Promise<void> => {
  return setPref(LIBRARY_SUBSCRIPTION_FILTER_KEY, filter);
};

export type { SubscriptionListFilter } from './prefsStore';
export { DEFAULT_SUBSCRIPTION_FILTER };
