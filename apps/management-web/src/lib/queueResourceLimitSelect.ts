import {
  QUEUE_RESOURCE_LIMIT_TIERS,
  selectQueueResourceLimitToStored,
  storedQueueResourceLimitToSelect,
} from '@podverse/helpers';

export { selectQueueResourceLimitToStored, storedQueueResourceLimitToSelect };

export function queueResourceLimitSelectOptions(labels: {
  defaultLabel: string;
}): { label: string; value: string }[] {
  return [
    { value: '', label: labels.defaultLabel },
    ...QUEUE_RESOURCE_LIMIT_TIERS.map((tier) => ({
      value: String(tier),
      label: String(tier),
    })),
  ];
}
