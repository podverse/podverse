import AsyncStorage from '@react-native-async-storage/async-storage';

const HOME_SUBSCRIPTION_FILTER_KEY = 'home.subscriptionFilter';
const LIBRARY_SUBSCRIPTION_FILTER_KEY = 'library.subscriptionFilter';

const SUBSCRIPTION_FILTERS = ['all', 'addByRss'] as const;

/** Shared All / Add-by-RSS filter value for every subscribed view (Home 8.16, Library 9.30). */
export type SubscriptionListFilter = (typeof SUBSCRIPTION_FILTERS)[number];

const isSubscriptionListFilter = (value: string): value is SubscriptionListFilter => {
  return SUBSCRIPTION_FILTERS.some((filter) => filter === value);
};

export const DEFAULT_SUBSCRIPTION_FILTER: SubscriptionListFilter = 'all';

const readFilter = async (key: string): Promise<SubscriptionListFilter | null> => {
  const value = await AsyncStorage.getItem(key);
  if (value === null) {
    return null;
  }

  if (!isSubscriptionListFilter(value)) {
    return null;
  }

  return value;
};

const writeFilter = async (key: string, filter: SubscriptionListFilter): Promise<void> => {
  await AsyncStorage.setItem(key, filter);
};

export const readHomeSubscriptionFilter = (): Promise<SubscriptionListFilter | null> => {
  return readFilter(HOME_SUBSCRIPTION_FILTER_KEY);
};

export const writeHomeSubscriptionFilter = (filter: SubscriptionListFilter): Promise<void> => {
  return writeFilter(HOME_SUBSCRIPTION_FILTER_KEY, filter);
};

export const readLibrarySubscriptionFilter = (): Promise<SubscriptionListFilter | null> => {
  return readFilter(LIBRARY_SUBSCRIPTION_FILTER_KEY);
};

export const writeLibrarySubscriptionFilter = (filter: SubscriptionListFilter): Promise<void> => {
  return writeFilter(LIBRARY_SUBSCRIPTION_FILTER_KEY, filter);
};
