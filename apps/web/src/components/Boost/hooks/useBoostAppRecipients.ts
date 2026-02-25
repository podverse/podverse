import type { AppValueRecipient } from '@podverse/helpers';

import type { PaymentRecipient } from '../types.js';
import { getAppValueRecipient } from '../../../utils/value/appValue';
import type { WebConfig } from '../../../config';

type UseBoostAppRecipientsParams = {
  config: WebConfig;
  totalAmountToApp: number;
  appRecipientType: string | null;
  appRecipientRecipientType?: string | null;
  includeAppRecipient?: boolean;
};

type UseBoostAppRecipientsResult = {
  appValueRecipient: AppValueRecipient | null;
  paymentRecipients: PaymentRecipient[];
};

export const useBoostAppRecipients = ({
  config,
  totalAmountToApp,
  appRecipientType,
  appRecipientRecipientType,
  includeAppRecipient = true,
}: UseBoostAppRecipientsParams): UseBoostAppRecipientsResult => {
  const appValueRecipient =
    includeAppRecipient && appRecipientType
      ? getAppValueRecipient({
          config,
          type: appRecipientType,
          recipientType: appRecipientRecipientType,
          final_amount: totalAmountToApp,
        })
      : null;

  const paymentRecipients =
    appValueRecipient !== null
      ? [
          {
            id: `app-${appValueRecipient.address}`,
            type:
              appValueRecipient.type === 'lnaddress' || appValueRecipient.type === 'node'
                ? 'lightning'
                : appValueRecipient.type,
            recipient_type:
              appValueRecipient.type === 'lnaddress' || appValueRecipient.type === 'node'
                ? appValueRecipient.type
                : null,
            address: appValueRecipient.address,
            name: appValueRecipient.name ?? null,
            custom_key: appValueRecipient.custom_key ?? null,
            custom_value: appValueRecipient.custom_value ?? null,
            normalized_split: appValueRecipient.normalized_split,
            final_amount: appValueRecipient.final_amount,
          },
        ]
      : [];

  return {
    appValueRecipient,
    paymentRecipients,
  };
};
