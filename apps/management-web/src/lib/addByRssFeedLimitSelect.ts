import {
  ADD_BY_RSS_FEED_LIMIT_SELECT_UNLIMITED,
  ADD_BY_RSS_FEED_TIERS,
  selectAddByRssFeedLimitToStored,
  storedAddByRssFeedLimitToSelect,
} from '@podverse/helpers';

export { selectAddByRssFeedLimitToStored, storedAddByRssFeedLimitToSelect };

export function addByRssFeedLimitSelectOptions(labels: {
  defaultLabel: string;
  unlimitedLabel: string;
}): { label: string; value: string }[] {
  return [
    { value: '', label: labels.defaultLabel },
    ...ADD_BY_RSS_FEED_TIERS.map((tier) => ({
      value: String(tier),
      label: String(tier),
    })),
    { value: ADD_BY_RSS_FEED_LIMIT_SELECT_UNLIMITED, label: labels.unlimitedLabel },
  ];
}
