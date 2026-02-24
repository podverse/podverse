import type { Dispatch, SetStateAction } from 'react';
import { useState } from 'react';

import type {
  AppValueRecipient,
  DTOChannel,
  DTOChannelValueRecipient,
  DTOItem,
  DTOItemValueRecipient,
} from '@podverse/helpers';
import type { RecipientAmount } from '@podverse/v4v-helpers';
import { calculateRecipientAmounts } from '@podverse/v4v-helpers';
import type { MetaBoost } from '@podverse/v4v-metaboost';
import { isLnaddressRecipient } from '@podverse/v4v-btc-ln';

import type { PaymentRecipient, RecipientStatus } from '../types.js';
import { getAppValueRecipient } from '../../../utils/value/appValue';

type ChannelValue = NonNullable<DTOChannel['channel_values']>[number];
type ItemValue = NonNullable<DTOItem['item_values']>[number];

type UseBoostRecipientsParams = {
  selectedChannelValue: ChannelValue | undefined;
  selectedItemValue: ItemValue | undefined;
  totalAmountToCreator: number;
  totalAmountToApp: number;
  selectedMethod: string | null;
  metaBoost: MetaBoost | null;
};

type BaseRecipient = DTOChannelValueRecipient | DTOItemValueRecipient;

type UseBoostRecipientsResult = {
  appValueRecipient: AppValueRecipient | null;
  channelValueRecipients: DTOChannelValueRecipient[] | undefined;
  hasLnaddressRecipients: boolean;
  hasStatusUpdates: boolean;
  itemValueRecipients: DTOItemValueRecipient[] | undefined;
  paymentRecipients: PaymentRecipient[];
  recipientStatuses: RecipientStatus[];
  setRecipientStatuses: Dispatch<SetStateAction<RecipientStatus[]>>;
  shouldShowBoostMessageNotice: boolean;
  toRecipientStatuses: (recipients: PaymentRecipient[]) => RecipientStatus[];
  updateRecipientStatus: (
    recipientId: string,
    status: RecipientStatus['status'],
    error?: string
  ) => void;
};

const getPaymentRecipients = (
  itemValueRecipients: DTOItemValueRecipient[] | undefined,
  channelValueRecipients: DTOChannelValueRecipient[] | undefined,
  appValueRecipient: AppValueRecipient | null,
  totalAmountToCreator: number,
  totalAmountToApp: number
): PaymentRecipient[] => {
  const baseRecipients: RecipientAmount<BaseRecipient>[] = itemValueRecipients?.length
    ? calculateRecipientAmounts(itemValueRecipients, totalAmountToCreator)
    : channelValueRecipients
      ? calculateRecipientAmounts(channelValueRecipients, totalAmountToCreator)
      : [];

  const paymentRecipients: PaymentRecipient[] = baseRecipients.map((recipient, index) => ({
    id: `${recipient.type}-${recipient.address}-${index}`,
    type: recipient.type,
    address: recipient.address,
    name: recipient.name ?? null,
    custom_key: recipient.custom_key ?? null,
    custom_value: recipient.custom_value ?? null,
    normalized_split: recipient.normalized_split,
    final_amount: recipient.final_amount,
  }));

  if (appValueRecipient && totalAmountToApp > 0) {
    paymentRecipients.push({
      id: `app-${appValueRecipient.address}`,
      type: appValueRecipient.type,
      address: appValueRecipient.address,
      name: appValueRecipient.name ?? null,
      custom_key: appValueRecipient.custom_key ?? null,
      custom_value: appValueRecipient.custom_value ?? null,
      normalized_split: appValueRecipient.normalized_split,
      final_amount: appValueRecipient.final_amount,
    });
  }

  return paymentRecipients;
};

const toRecipientStatuses = (recipients: PaymentRecipient[]): RecipientStatus[] =>
  recipients.map((recipient) => ({
    ...recipient,
    status: 'pending',
  }));

const updateRecipientStatusList = (
  statuses: RecipientStatus[],
  recipientId: string,
  status: RecipientStatus['status'],
  error?: string
): RecipientStatus[] =>
  statuses.map((recipient) =>
    recipient.id === recipientId ? { ...recipient, status, error } : recipient
  );

export const useBoostRecipients = ({
  selectedChannelValue,
  selectedItemValue,
  totalAmountToCreator,
  totalAmountToApp,
  selectedMethod,
  metaBoost,
}: UseBoostRecipientsParams): UseBoostRecipientsResult => {
  const itemValueRecipients = selectedItemValue?.item_value_recipients;
  const channelValueRecipients = selectedChannelValue?.channel_value_recipients;

  const appValueRecipient = selectedChannelValue
    ? getAppValueRecipient({
        type: selectedChannelValue.type,
        method: selectedChannelValue.method,
        final_amount: totalAmountToApp,
      })
    : null;

  const paymentRecipients =
    selectedItemValue?.item_value_recipients || selectedChannelValue?.channel_value_recipients
      ? getPaymentRecipients(
          itemValueRecipients,
          channelValueRecipients,
          appValueRecipient,
          totalAmountToCreator,
          totalAmountToApp
        )
      : [];

  const [recipientStatuses, setRecipientStatuses] = useState<RecipientStatus[]>([]);

  const hasLnaddressRecipients = paymentRecipients.some((recipient) =>
    isLnaddressRecipient(recipient.type)
  );

  const shouldShowBoostMessageNotice =
    hasLnaddressRecipients && !metaBoost && selectedMethod !== 'keysend';

  const hasStatusUpdates = recipientStatuses.length > 0;

  const updateRecipientStatus = (
    recipientId: string,
    status: RecipientStatus['status'],
    error?: string
  ) => {
    setRecipientStatuses((prev) => updateRecipientStatusList(prev, recipientId, status, error));
  };

  return {
    appValueRecipient,
    channelValueRecipients,
    hasLnaddressRecipients,
    hasStatusUpdates,
    itemValueRecipients,
    paymentRecipients,
    recipientStatuses,
    setRecipientStatuses,
    shouldShowBoostMessageNotice,
    toRecipientStatuses,
    updateRecipientStatus,
  };
};
