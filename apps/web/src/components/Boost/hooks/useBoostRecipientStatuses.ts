import type { Dispatch, SetStateAction } from 'react';
import { useState } from 'react';

import type { PaymentRecipient, RecipientStatus } from '../types.js';

type UseBoostRecipientStatusesResult = {
  hasStatusUpdates: boolean;
  recipientStatuses: RecipientStatus[];
  setRecipientStatuses: Dispatch<SetStateAction<RecipientStatus[]>>;
  toRecipientStatuses: (recipients: PaymentRecipient[]) => RecipientStatus[];
  updateRecipientStatus: (
    recipientId: string,
    status: RecipientStatus['status'],
    error?: string,
    errorRetries?: number,
    errorProviderMessage?: string
  ) => void;
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
  error?: string,
  errorRetries?: number,
  errorProviderMessage?: string
): RecipientStatus[] =>
  statuses.map((recipient) =>
    recipient.id === recipientId
      ? { ...recipient, status, error, errorRetries, errorProviderMessage }
      : recipient
  );

export const useBoostRecipientStatuses = (): UseBoostRecipientStatusesResult => {
  const [recipientStatuses, setRecipientStatuses] = useState<RecipientStatus[]>([]);

  const updateRecipientStatus = (
    recipientId: string,
    status: RecipientStatus['status'],
    error?: string,
    errorRetries?: number,
    errorProviderMessage?: string
  ) => {
    setRecipientStatuses((prev) =>
      updateRecipientStatusList(
        prev,
        recipientId,
        status,
        error,
        errorRetries,
        errorProviderMessage
      )
    );
  };

  return {
    hasStatusUpdates: recipientStatuses.length > 0,
    recipientStatuses,
    setRecipientStatuses,
    toRecipientStatuses,
    updateRecipientStatus,
  };
};
