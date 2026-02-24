import { useEffect, useState } from 'react';

import type { DTOChannel, DTOItem } from '@podverse/helpers';
import { toMetaBoost } from '@podverse/v4v-metaboost';

type Translator = (key: string, values?: Record<string, string | number>) => string;

type ChannelValue = NonNullable<DTOChannel['channel_values']>[number];
type ItemValue = NonNullable<DTOItem['item_values']>[number];

type UseBoostSelectionParams = {
  channel: DTOChannel;
  item: DTOItem | null;
  tValue: Translator;
};

const getValueKey = (value: ChannelValue | ItemValue): string =>
  value.type === 'lightning' ? 'lightning' : `${value.type}_${value.method}`;

const buildButtonTabs = (
  values: ChannelValue[],
  tValue: Translator,
  setSelectedKey: (key: string) => void
) => {
  const seen = new Set<string>();
  return values.reduce<{ key: string; label: string; onClick: () => void }[]>((acc, value) => {
    const key = getValueKey(value);
    if (seen.has(key)) {
      return acc;
    }
    seen.add(key);
    acc.push({
      key,
      label: tValue(`types.${key}.label`),
      onClick: () => setSelectedKey(key),
    });
    return acc;
  }, []);
};

const mergeLightningChannelValues = (values: ChannelValue[]): ChannelValue[] => {
  const lightningValues = values.filter((value) => value.type === 'lightning');
  if (lightningValues.length <= 1) {
    return values;
  }
  const firstLightning = lightningValues[0];
  if (!firstLightning) {
    return values;
  }
  const mergedRecipients = lightningValues.reduce<ChannelValue['channel_value_recipients']>(
    (acc, value) => [...acc, ...value.channel_value_recipients],
    []
  );
  const mergedMetaBoost =
    lightningValues.find((value) => value.meta_boost !== null && value.meta_boost !== undefined)
      ?.meta_boost ?? null;
  const mergedLightning: ChannelValue = {
    ...firstLightning,
    method: 'keysend',
    meta_boost: mergedMetaBoost,
    channel_value_recipients: mergedRecipients,
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

const mergeLightningItemValues = (values: ItemValue[]): ItemValue[] => {
  const lightningValues = values.filter((value) => value.type === 'lightning');
  if (lightningValues.length <= 1) {
    return values;
  }
  const firstLightning = lightningValues[0];
  if (!firstLightning) {
    return values;
  }
  const mergedRecipients = lightningValues.reduce<ItemValue['item_value_recipients']>(
    (acc, value) => [...acc, ...value.item_value_recipients],
    []
  );
  const mergedMetaBoost =
    lightningValues.find((value) => value.meta_boost !== null && value.meta_boost !== undefined)
      ?.meta_boost ?? null;
  const mergedLightning: ItemValue = {
    ...firstLightning,
    method: 'keysend',
    meta_boost: mergedMetaBoost,
    item_value_recipients: mergedRecipients,
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

export const useBoostSelection = ({ channel, item, tValue }: UseBoostSelectionParams) => {
  const channelValues: ChannelValue[] = mergeLightningChannelValues(channel.channel_values ?? []);
  const itemValues: ItemValue[] = mergeLightningItemValues(item?.item_values ?? []);
  const [selectedKey, setSelectedKey] = useState('');

  useEffect(() => {
    if (channelValues.length > 0 && !selectedKey) {
      const firstValue = channelValues[0];
      if (firstValue) {
        setSelectedKey(getValueKey(firstValue));
      }
    }
  }, [channelValues, selectedKey]);

  const selectedChannelValue: ChannelValue | undefined = channelValues.find(
    (cv) => getValueKey(cv) === selectedKey
  );

  const selectedItemValue: ItemValue | undefined =
    itemValues.find(
      (value) => selectedChannelValue && getValueKey(value) === getValueKey(selectedChannelValue)
    ) ?? itemValues[0];

  const metaBoost =
    toMetaBoost(
      selectedItemValue?.meta_boost?.type ?? null,
      selectedItemValue?.meta_boost?.schema ?? null,
      selectedItemValue?.meta_boost?.license ?? null,
      selectedItemValue?.meta_boost?.node ?? null
    ) ??
    toMetaBoost(
      selectedChannelValue?.meta_boost?.type ?? null,
      selectedChannelValue?.meta_boost?.schema ?? null,
      selectedChannelValue?.meta_boost?.license ?? null,
      selectedChannelValue?.meta_boost?.node ?? null
    );

  const buttonTabs = buildButtonTabs(channelValues, tValue, setSelectedKey);

  const selectedValueKey = selectedChannelValue ? getValueKey(selectedChannelValue) : null;

  return {
    buttonTabs,
    channelValues,
    selectedChannelValue,
    selectedItemValue,
    selectedKey,
    selectedValueKey,
    setSelectedKey,
    metaBoost,
  };
};
