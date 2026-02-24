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
    error?: string
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
  error?: string
): RecipientStatus[] =>
  statuses.map((recipient) =>
    recipient.id === recipientId ? { ...recipient, status, error } : recipient
  );

export const useBoostRecipientStatuses = (): UseBoostRecipientStatusesResult => {
  const [recipientStatuses, setRecipientStatuses] = useState<RecipientStatus[]>([]);

  const updateRecipientStatus = (
    recipientId: string,
    status: RecipientStatus['status'],
    error?: string
  ) => {
    setRecipientStatuses((prev) => updateRecipientStatusList(prev, recipientId, status, error));
  };

  return {
    hasStatusUpdates: recipientStatuses.length > 0,
    recipientStatuses,
    setRecipientStatuses,
    toRecipientStatuses,
    updateRecipientStatus,
  };
};
