import type { DTOChannel, DTOItem } from '@podverse/helpers';

type ChannelValue = NonNullable<DTOChannel['channel_values']>[number];
type ItemValue = NonNullable<DTOItem['item_values']>[number];
type ChannelRecipient = ChannelValue['channel_value_recipients'][number];
type ItemRecipient = ItemValue['item_value_recipients'][number];

export type BoostValueKeySource = {
  method: string;
  type: string;
};

export type BoostRecipientDisplay = {
  address: string;
  amount: number;
  id: string;
  name: string | null;
  splitPercent: number;
};

const KNOWN_VALUE_KEYS = new Set([
  'lightning',
  'paypal_send',
  'patreon_send',
  'buymeacoffee_send',
]);

export const boostValueKey = (value: BoostValueKeySource): string =>
  value.type === 'lightning' ? 'lightning' : `${value.type}_${value.method}`;

export const boostValueLabelKey = (key: string): string | null => {
  if (!KNOWN_VALUE_KEYS.has(key)) {
    return null;
  }
  return `value.types.${key}.label`;
};

export const boostValueDenominationKey = (key: string): string | null => {
  if (!KNOWN_VALUE_KEYS.has(key)) {
    return null;
  }
  return `value.types.${key}.denomination`;
};

const mergeLightningChannelValues = (values: readonly ChannelValue[]): ChannelValue[] => {
  const lightningValues = values.filter((value) => value.type === 'lightning');
  if (lightningValues.length <= 1) {
    return [...values];
  }
  const firstLightning = lightningValues[0];
  if (firstLightning === undefined) {
    return [...values];
  }
  const mergedRecipients = lightningValues.reduce<ChannelRecipient[]>(
    (acc, value) => [...acc, ...value.channel_value_recipients],
    []
  );
  const mergedLightning: ChannelValue = {
    ...firstLightning,
    channel_value_recipients: mergedRecipients,
    method: 'keysend',
  };
  const mergedValues: ChannelValue[] = [];
  let lightningInserted = false;
  for (const value of values) {
    if (value.type === 'lightning') {
      if (!lightningInserted) {
        mergedValues.push(mergedLightning);
        lightningInserted = true;
      }
      continue;
    }
    mergedValues.push(value);
  }
  return mergedValues;
};

const mergeLightningItemValues = (values: readonly ItemValue[]): ItemValue[] => {
  const lightningValues = values.filter((value) => value.type === 'lightning');
  if (lightningValues.length <= 1) {
    return [...values];
  }
  const firstLightning = lightningValues[0];
  if (firstLightning === undefined) {
    return [...values];
  }
  const mergedRecipients = lightningValues.reduce<ItemRecipient[]>(
    (acc, value) => [...acc, ...value.item_value_recipients],
    []
  );
  const mergedLightning: ItemValue = {
    ...firstLightning,
    item_value_recipients: mergedRecipients,
    method: 'keysend',
  };
  const mergedValues: ItemValue[] = [];
  let lightningInserted = false;
  for (const value of values) {
    if (value.type === 'lightning') {
      if (!lightningInserted) {
        mergedValues.push(mergedLightning);
        lightningInserted = true;
      }
      continue;
    }
    mergedValues.push(value);
  }
  return mergedValues;
};

export type BoostValueTab = {
  channelValue: ChannelValue | null;
  itemValue: ItemValue | null;
  key: string;
};

export const buildBoostValueTabs = (
  channel: DTOChannel,
  item: DTOItem | null
): BoostValueTab[] => {
  const channelValues = mergeLightningChannelValues(channel.channel_values ?? []);
  const itemValues = mergeLightningItemValues(item?.item_values ?? []);
  const seen = new Set<string>();
  const tabs: BoostValueTab[] = [];
  for (const value of channelValues) {
    const key = boostValueKey(value);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    const itemValue = itemValues.find((candidate) => boostValueKey(candidate) === key) ?? null;
    tabs.push({ channelValue: value, itemValue, key });
  }
  return tabs;
};

const recipientRows = (
  recipients: readonly {
    address: string;
    id: number;
    name?: string | null;
    split: number;
  }[],
  totalAmount: number
): BoostRecipientDisplay[] => {
  const totalSplit = recipients.reduce((sum, recipient) => sum + recipient.split, 0);
  return recipients.map((recipient, index) => {
    const share = totalSplit > 0 ? recipient.split / totalSplit : 0;
    return {
      address: recipient.address,
      amount: share * totalAmount,
      id: `${recipient.id}-${index}`,
      name: recipient.name,
      splitPercent: Math.round(share * 100),
    };
  });
};

/**
 * Item recipients replace channel recipients entirely when the selected item value has any.
 */
export const boostRecipientsForTab = (
  tab: BoostValueTab | null,
  totalAmount: number
): BoostRecipientDisplay[] => {
  if (tab === null) {
    return [];
  }
  const itemRecipients = tab.itemValue?.item_value_recipients ?? [];
  if (itemRecipients.length > 0) {
    return recipientRows(itemRecipients, totalAmount);
  }
  return recipientRows(tab.channelValue?.channel_value_recipients ?? [], totalAmount);
};

export const recipientTypesForTab = (tab: BoostValueTab | null): string[] => {
  if (tab === null) {
    return [];
  }
  const itemRecipients = tab.itemValue?.item_value_recipients ?? [];
  const source =
    itemRecipients.length > 0
      ? itemRecipients
      : (tab.channelValue?.channel_value_recipients ?? []);
  return source.map((recipient) => recipient.type);
};

export const shouldShowBoostMessageFields = (
  valueKey: string,
  recipientTypes: readonly string[]
): boolean => {
  if (valueKey === 'lightning') {
    return true;
  }
  return !recipientTypes.some((type) => type === 'lnaddress');
};
