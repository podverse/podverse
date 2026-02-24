import type {
  DTOChannel,
  DTOChannelValueRecipient,
  DTOItem,
  DTOItemValueRecipient,
} from '@podverse/helpers';
import type { RecipientAmount } from '@podverse/v4v-helpers';
import { calculateRecipientAmounts } from '@podverse/v4v-helpers';

import type { PaymentRecipient } from '../types.js';

type ChannelValue = NonNullable<DTOChannel['channel_values']>[number];
type ItemValue = NonNullable<DTOItem['item_values']>[number];

type UseBoostRecipientsParams = {
  selectedChannelValue: ChannelValue | undefined;
  selectedItemValue: ItemValue | undefined;
  totalAmountToCreator: number;
  includeCreatorRecipients?: boolean;
};

type BaseRecipient = DTOChannelValueRecipient | DTOItemValueRecipient;

type UseBoostRecipientsResult = {
  channelValueRecipients: DTOChannelValueRecipient[] | undefined;
  itemValueRecipients: DTOItemValueRecipient[] | undefined;
  paymentRecipients: PaymentRecipient[];
};

const resolveLightningRecipientType = (recipientType: string): string | null =>
  recipientType === 'lnaddress' || recipientType === 'node' ? recipientType : null;

const getPaymentRecipients = (
  itemValueRecipients: DTOItemValueRecipient[] | undefined,
  channelValueRecipients: DTOChannelValueRecipient[] | undefined,
  totalAmountToCreator: number
): PaymentRecipient[] => {
  const baseRecipients: RecipientAmount<BaseRecipient>[] = itemValueRecipients?.length
    ? calculateRecipientAmounts(itemValueRecipients, totalAmountToCreator)
    : channelValueRecipients
      ? calculateRecipientAmounts(channelValueRecipients, totalAmountToCreator)
      : [];

  const paymentRecipients: PaymentRecipient[] = baseRecipients.map((recipient, index) => {
    const lightningRecipientType = resolveLightningRecipientType(recipient.type);
    const type = lightningRecipientType ? 'lightning' : recipient.type;
    const typeKey = lightningRecipientType ?? recipient.type;
    return {
      id: `${type}-${typeKey}-${recipient.address}-${index}`,
      type,
      recipient_type: lightningRecipientType,
      address: recipient.address,
      name: recipient.name ?? null,
      custom_key: recipient.custom_key ?? null,
      custom_value: recipient.custom_value ?? null,
      normalized_split: recipient.normalized_split,
      final_amount: recipient.final_amount,
    };
  });

  return paymentRecipients;
};

export const useBoostRecipients = ({
  selectedChannelValue,
  selectedItemValue,
  totalAmountToCreator,
  includeCreatorRecipients = true,
}: UseBoostRecipientsParams): UseBoostRecipientsResult => {
  const itemValueRecipients = selectedItemValue?.item_value_recipients;
  const channelValueRecipients = selectedChannelValue?.channel_value_recipients;

  const shouldIncludeCreatorRecipients =
    includeCreatorRecipients &&
    (selectedItemValue?.item_value_recipients || selectedChannelValue?.channel_value_recipients);

  const paymentRecipients = shouldIncludeCreatorRecipients
    ? getPaymentRecipients(itemValueRecipients, channelValueRecipients, totalAmountToCreator)
    : [];

  return {
    channelValueRecipients,
    itemValueRecipients,
    paymentRecipients,
  };
};
