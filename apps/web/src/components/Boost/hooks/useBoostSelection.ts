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

const METHOD_PRIORITY_ORDER = ['lnaddress', 'keysend'];

const sortChannelValuesWithLnaddressFirst = (values: ChannelValue[]): ChannelValue[] => {
  return [...values].sort((a, b) => {
    if (a.type !== 'lightning' || b.type !== 'lightning') return 0;
    const aIdx = METHOD_PRIORITY_ORDER.indexOf(a.method);
    const bIdx = METHOD_PRIORITY_ORDER.indexOf(b.method);
    if (aIdx === -1 && bIdx === -1) return 0;
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });
};

export const useBoostSelection = ({ channel, item, tValue }: UseBoostSelectionParams) => {
  const channelValues: ChannelValue[] = sortChannelValuesWithLnaddressFirst(
    channel.channel_values ?? []
  );
  const [selectedKey, setSelectedKey] = useState('');

  useEffect(() => {
    if (channelValues.length > 0 && !selectedKey) {
      const firstValue = channelValues[0];
      if (firstValue) {
        setSelectedKey(`${firstValue.type}_${firstValue.method}`);
      }
    }
  }, [channelValues, selectedKey]);

  const selectedChannelValue: ChannelValue | undefined = channelValues.find(
    (cv) => `${cv.type}_${cv.method}` === selectedKey
  );

  const selectedItemValue: ItemValue | undefined =
    item?.item_values?.find(
      (value) =>
        selectedChannelValue &&
        value.type === selectedChannelValue.type &&
        value.method === selectedChannelValue.method
    ) ?? item?.item_values?.[0];

  const selectedMethod = selectedItemValue?.method ?? selectedChannelValue?.method ?? null;

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

  const buttonTabs = channelValues.map((cv) => ({
    key: `${cv.type}_${cv.method}`,
    label: tValue(`types.${cv.type}_${cv.method}.label`),
    onClick: () => setSelectedKey(`${cv.type}_${cv.method}`),
  }));

  const selectedValueKey = selectedChannelValue
    ? `${selectedChannelValue.type}_${selectedChannelValue.method}`
    : null;

  return {
    buttonTabs,
    channelValues,
    selectedChannelValue,
    selectedItemValue,
    selectedKey,
    selectedMethod,
    selectedValueKey,
    setSelectedKey,
    metaBoost,
  };
};
