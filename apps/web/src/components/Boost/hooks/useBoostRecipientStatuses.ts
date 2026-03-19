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
    errorProviderMessage?: string,
    errorDetails?: string[] | ((prev: string[] | undefined) => string[])
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
  errorProviderMessage?: string,
  errorDetails?: string[] | ((prev: string[] | undefined) => string[])
): RecipientStatus[] =>
  statuses.map((recipient) => {
    if (recipient.id !== recipientId) return recipient;
    const resolvedDetails =
      errorDetails === undefined
        ? recipient.errorDetails
        : typeof errorDetails === 'function'
          ? errorDetails(recipient.errorDetails)
          : errorDetails;
    return {
      ...recipient,
      status,
      error,
      errorRetries,
      errorProviderMessage,
      errorDetails: resolvedDetails,
    };
  });

export const useBoostRecipientStatuses = (): UseBoostRecipientStatusesResult => {
  const [recipientStatuses, setRecipientStatuses] = useState<RecipientStatus[]>([]);

  const updateRecipientStatus = (
    recipientId: string,
    status: RecipientStatus['status'],
    error?: string,
    errorRetries?: number,
    errorProviderMessage?: string,
    errorDetails?: string[] | ((prev: string[] | undefined) => string[])
  ) => {
    setRecipientStatuses((prev) =>
      updateRecipientStatusList(
        prev,
        recipientId,
        status,
        error,
        errorRetries,
        errorProviderMessage,
        errorDetails
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
