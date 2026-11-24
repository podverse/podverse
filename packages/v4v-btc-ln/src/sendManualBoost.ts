import { sortRecipientsBySplitDescending } from '@podverse/v4v-helpers';

import {
  buildBlip10Metadata,
  buildBlipMessage,
  buildCustomRecords,
  serializeBlip10Metadata,
} from './blip10.js';
import type { BoostPaymentProvider } from './boostPaymentProvider.js';
import { sendKeysendPayment, sendLnaddressPayment } from './payments.js';

const MANUAL_BOOST_ACTION = 'boost';

export type BoostRecipientPaymentMethod = 'lnaddress_invoice' | 'node_keysend';

/**
 * `lightning` + `lnaddress` is an invoice. `lightning` + `node` is keysend.
 * Anything else is unpaid. The value-block method attribute is not an input.
 */
export const boostRecipientPaymentMethod = (
  valueType: string,
  recipientType: string | null
): BoostRecipientPaymentMethod | null => {
  if (valueType !== 'lightning') {
    return null;
  }
  if (recipientType === 'lnaddress') {
    return 'lnaddress_invoice';
  }
  if (recipientType === 'node') {
    return 'node_keysend';
  }
  return null;
};

export type ManualBoostRecipientInput = {
  id: string;
  valueType: string;
  recipientType: string | null;
  address: string;
  name: string | null;
  customKey: string | null;
  customValue: string | null;
  normalizedSplit: number;
  split: number;
  finalAmountSats: number;
};

export type ManualBoostRecipientEvent =
  | { type: 'paying'; id: string }
  | { type: 'attempt_failed'; id: string; attemptNumber: number; message: string }
  | { type: 'success'; id: string }
  | { type: 'failed'; id: string; error: unknown };

export type SendManualBoostParams = {
  provider: BoostPaymentProvider;
  recipients: ManualBoostRecipientInput[];
  /** LNURL comment. Null on the no-MetaBoost path. */
  paymentDescription: string | null;
  message: string;
  senderName: string;
  allowBlipFallback: boolean;
  appName: string;
  feedGuid?: string;
  feedTitle?: string;
  itemGuid?: string;
  itemTitle?: string;
  onRecipientEvent: (event: ManualBoostRecipientEvent) => void;
};

export type SendManualBoostResult = {
  anyRecipientFailed: boolean;
  /**
   * First recipient in input order among finalAmountSats > 0 with the greatest split.
   * Null when every amount is 0.
   */
  largestSplitRecipientId: string | null;
  largestSplitSucceeded: boolean;
  totalMsat: number;
};

const splitKey = (recipient: ManualBoostRecipientInput): number =>
  recipient.normalizedSplit ?? recipient.split;

const findLargestSplitRecipientId = (recipients: ManualBoostRecipientInput[]): string | null => {
  let largest: ManualBoostRecipientInput | null = null;
  for (const recipient of recipients) {
    if (recipient.finalAmountSats <= 0) {
      continue;
    }
    if (largest === null || splitKey(recipient) > splitKey(largest)) {
      largest = recipient;
    }
  }
  return largest === null ? null : largest.id;
};

const sumPositiveFinalAmountSats = (recipients: ManualBoostRecipientInput[]): number =>
  recipients.reduce((sum, recipient) => {
    if (recipient.finalAmountSats <= 0) {
      return sum;
    }
    return sum + recipient.finalAmountSats;
  }, 0);

const buildNodeKeysendCustomRecords = (
  recipient: ManualBoostRecipientInput,
  params: SendManualBoostParams,
  totalMsat: number
): Record<string, string> | undefined => {
  const shouldIncludeBlip = params.paymentDescription !== null || params.allowBlipFallback;
  const blipMessage = buildBlipMessage(
    params.paymentDescription,
    params.allowBlipFallback,
    params.message
  );
  const senderNameForRecord = params.senderName.trim();
  const amountMsat = Math.max(0, Math.round(recipient.finalAmountSats * 1000));
  const blipPayload = shouldIncludeBlip
    ? serializeBlip10Metadata(
        buildBlip10Metadata({
          action: MANUAL_BOOST_ACTION,
          value_msat_total: totalMsat,
          value_msat: amountMsat,
          app_name: params.appName,
          sender_name: senderNameForRecord,
          message: blipMessage,
          guid: params.feedGuid,
          podcast: params.feedTitle,
          episode: params.itemTitle,
          episode_guid: params.itemGuid,
          name: recipient.name ?? undefined,
        })
      )
    : null;
  return buildCustomRecords(blipPayload, recipient.customKey, recipient.customValue);
};

export const sendManualBoost = async (
  params: SendManualBoostParams
): Promise<SendManualBoostResult> => {
  const { provider, recipients, paymentDescription, onRecipientEvent } = params;
  const totalMsat = Math.max(0, Math.round(sumPositiveFinalAmountSats(recipients) * 1000));
  const largestSplitRecipientId = findLargestSplitRecipientId(recipients);
  const orderedRecipients = sortRecipientsBySplitDescending(
    recipients
      .filter((recipient) => recipient.finalAmountSats > 0)
      .map((recipient) => ({
        ...recipient,
        normalized_split: recipient.normalizedSplit,
        split: recipient.split,
      }))
  );

  let anyRecipientFailed = false;
  let largestSplitSucceeded = false;

  for (const recipient of orderedRecipients) {
    try {
      const method = boostRecipientPaymentMethod(recipient.valueType, recipient.recipientType);
      if (method === 'lnaddress_invoice') {
        onRecipientEvent({ type: 'paying', id: recipient.id });
        await sendLnaddressPayment({
          recipientAddress: recipient.address,
          amountMsat: Math.max(0, Math.round(recipient.finalAmountSats * 1000)),
          desc: paymentDescription,
          provider,
          onAttemptFailed: (attemptNumber, attemptMessage) => {
            onRecipientEvent({
              type: 'attempt_failed',
              id: recipient.id,
              attemptNumber,
              message: attemptMessage,
            });
          },
        });
      } else if (method === 'node_keysend') {
        onRecipientEvent({ type: 'paying', id: recipient.id });
        await sendKeysendPayment({
          destination: recipient.address,
          amountSats: Math.max(0, Math.round(recipient.finalAmountSats)),
          customRecords: buildNodeKeysendCustomRecords(recipient, params, totalMsat),
          provider,
        });
      } else {
        throw new Error('Unsupported recipient type.');
      }
      onRecipientEvent({ type: 'success', id: recipient.id });
      if (recipient.id === largestSplitRecipientId) {
        largestSplitSucceeded = true;
      }
    } catch (error) {
      anyRecipientFailed = true;
      onRecipientEvent({ type: 'failed', id: recipient.id, error });
    }
  }

  return {
    anyRecipientFailed,
    largestSplitRecipientId,
    largestSplitSucceeded,
    totalMsat,
  };
};
