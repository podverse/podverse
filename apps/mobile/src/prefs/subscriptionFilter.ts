import type { SubscriptionListFilter } from './prefsStore';
import { DEFAULT_SUBSCRIPTION_FILTER, getPref, setPref } from './prefsStore';

const HOME_SUBSCRIPTION_FILTER_KEY = 'home.subscriptionFilter';
const LIBRARY_SUBSCRIPTION_FILTER_KEY = 'library.subscriptionFilter';

export const readHomeSubscriptionFilter = (): Promise<SubscriptionListFilter | null> => {
  return getPref(HOME_SUBSCRIPTION_FILTER_KEY);
};

export const writeHomeSubscriptionFilter = (filter: SubscriptionListFilter): Promise<void> => {
  return setPref(HOME_SUBSCRIPTION_FILTER_KEY, filter);
};

export const readLibrarySubscriptionFilter = (): Promise<SubscriptionListFilter | null> => {
  return getPref(LIBRARY_SUBSCRIPTION_FILTER_KEY);
};

export const writeLibrarySubscriptionFilter = (filter: SubscriptionListFilter): Promise<void> => {
  return setPref(LIBRARY_SUBSCRIPTION_FILTER_KEY, filter);
};

export type { SubscriptionListFilter } from './prefsStore';
export { DEFAULT_SUBSCRIPTION_FILTER };
