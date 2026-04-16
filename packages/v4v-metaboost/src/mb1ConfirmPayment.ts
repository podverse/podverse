import {
  isObjectLike,
  toNonEmptyTrimmedString,
  toNullableTrimmedString,
  toPositiveFiniteNumber,
} from '@podverse/helpers';

export const MB1_RECIPIENT_OUTCOME_STATUSES = ['verified', 'failed', 'undetermined'] as const;
export type Mb1RecipientOutcomeStatus = (typeof MB1_RECIPIENT_OUTCOME_STATUSES)[number];

export type Mb1RecipientOutcome = {
  type: string;
  address: string;
  split: number;
  name: string | null;
  custom_key: string | null;
  custom_value: string | null;
  fee: boolean;
  status: Mb1RecipientOutcomeStatus;
};

export type Mb1ConfirmPaymentRequest = {
  message_guid: string;
  recipient_outcomes: Mb1RecipientOutcome[];
};

export type PaymentRecipientLike = {
  type: string;
  address: string;
  split?: number;
  normalized_split?: number;
  name?: string | null;
  custom_key?: string | null;
  custom_value?: string | null;
  fee?: boolean;
};

export type PaymentRecipientStatusLike = PaymentRecipientLike & {
  status: 'pending' | 'paying' | 'success' | 'failed';
};

const isMb1RecipientOutcomeStatus = (value: unknown): value is Mb1RecipientOutcomeStatus =>
  typeof value === 'string' && MB1_RECIPIENT_OUTCOME_STATUSES.some((status) => status === value);

export const mapPaymentStatusToMb1OutcomeStatus = (
  status: PaymentRecipientStatusLike['status']
): Mb1RecipientOutcomeStatus => {
  if (status === 'success') {
    return 'verified';
  }
  if (status === 'failed') {
    return 'failed';
  }
  return 'undetermined';
};

export const sanitizeMb1RecipientOutcome = (value: unknown): Mb1RecipientOutcome | null => {
  if (!isObjectLike(value)) {
    return null;
  }
  const type = toNonEmptyTrimmedString(value.type);
  const address = toNonEmptyTrimmedString(value.address);
  const split = toPositiveFiniteNumber(value.split);
  const fee = value.fee;
  const status = value.status;
  if (type === null || address === null || split === null || typeof fee !== 'boolean') {
    return null;
  }
  if (!isMb1RecipientOutcomeStatus(status)) {
    return null;
  }
  return {
    type,
    address,
    split,
    name: toNullableTrimmedString(value.name),
    custom_key: toNullableTrimmedString(value.custom_key),
    custom_value: toNullableTrimmedString(value.custom_value),
    fee,
    status,
  };
};

export const toMb1ConfirmPaymentRequest = (params: {
  messageGuid: string;
  recipientOutcomes: unknown[];
}): Mb1ConfirmPaymentRequest | null => {
  const messageGuid = toNonEmptyTrimmedString(params.messageGuid);
  if (messageGuid === null || !Array.isArray(params.recipientOutcomes)) {
    return null;
  }
  const recipientOutcomes = params.recipientOutcomes
    .map(sanitizeMb1RecipientOutcome)
    .filter((outcome): outcome is Mb1RecipientOutcome => outcome !== null);
  if (recipientOutcomes.length === 0) {
    return null;
  }
  return {
    message_guid: messageGuid,
    recipient_outcomes: recipientOutcomes,
  };
};

export const buildMb1ConfirmPaymentRequestFromRecipientStatuses = (params: {
  messageGuid: string;
  recipientStatuses: PaymentRecipientStatusLike[];
}): Mb1ConfirmPaymentRequest | null => {
  const recipientOutcomes = params.recipientStatuses.map((recipient) => ({
    type: recipient.type,
    address: recipient.address,
    split: recipient.split ?? recipient.normalized_split ?? 0,
    name: recipient.name ?? null,
    custom_key: recipient.custom_key ?? null,
    custom_value: recipient.custom_value ?? null,
    fee: recipient.fee ?? false,
    status: mapPaymentStatusToMb1OutcomeStatus(recipient.status),
  }));
  return toMb1ConfirmPaymentRequest({
    messageGuid: params.messageGuid,
    recipientOutcomes,
  });
};
