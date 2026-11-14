import {
  FOLLOW_LIMIT_SELECT_UNLIMITED,
  FOLLOW_LIMIT_TIERS,
  selectFollowLimitToStored,
  storedFollowLimitToSelect,
} from '@podverse/helpers';

export { selectFollowLimitToStored, storedFollowLimitToSelect };

export function followLimitSelectOptions(labels: {
  defaultLabel: string;
  unlimitedLabel: string;
}): { label: string; value: string }[] {
  return [
    { value: '', label: labels.defaultLabel },
    ...FOLLOW_LIMIT_TIERS.map((tier) => ({
      value: String(tier),
      label: String(tier),
    })),
    { value: FOLLOW_LIMIT_SELECT_UNLIMITED, label: labels.unlimitedLabel },
  ];
}
