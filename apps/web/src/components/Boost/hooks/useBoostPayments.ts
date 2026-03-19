import type { Dispatch, SetStateAction } from 'react';

import type { DTOChannel, DTOItem } from '@podverse/helpers';
import { request } from '@podverse/helpers-requests';
import {
  buildBlip10Metadata,
  buildBlipMessage,
  buildCustomRecords,
  sendKeysendPayment,
  sendLnaddressPayment,
  serializeBlip10Metadata,
} from '@podverse/v4v-btc-ln';
import { PROVIDER_FAILURE_PROP } from '@podverse/v4v-helpers';
import type { MetaBoost } from '@podverse/v4v-metaboost';
import {
  buildBoostMetadataRequest,
  isBoostMetadataResponse,
  META_BOOST_SCHEMA_BOOSTBOX,
} from '@podverse/v4v-metaboost';

import { ensureWeblnEnabled } from '../../../utils/value/webln';
import type { PaymentRecipient, RecipientStatus } from '../types.js';

type Translator = (key: string, values?: Record<string, string | number>) => string;

type AppConfig = {
  public: {
    brand: {
      name: string;
    };
    api?: {
      client?: { protocol?: string; host?: string; port?: string };
      prefix?: string;
      version?: string;
    };
  };
};

function getMetaboostBoostboxBoostUrl(config: AppConfig): string | null {
  const api = config.public?.api;
  const client = api?.client;
  if (
    client?.protocol === undefined ||
    client?.host === undefined ||
    api?.prefix === undefined ||
    api?.version === undefined
  ) {
    return null;
  }
  const portPart = client.port !== undefined && client.port !== '' ? `:${client.port}` : '';
  const prefix = api.prefix.replace(/\/$/, '');
  return `${client.protocol}://${client.host}${portPart}${prefix}${api.version}/metaboost/boostbox/boost`;
}

type BoostMessageModalParams = {
  title: string;
  message: string;
  onSendAnyway: () => void;
  onCancel: () => void;
};

type UseBoostPaymentsParams = {
  channel: DTOChannel | null;
  item: DTOItem | null;
  config: AppConfig;
  tValue: Translator;
  message: string;
  yourName: string;
  metaBoost: MetaBoost | null;
  totalAmountToCreator: number;
  totalAmountToApp: number;
  paymentRecipients: PaymentRecipient[];
  toRecipientStatuses: (recipients: PaymentRecipient[]) => RecipientStatus[];
  updateRecipientStatus: (
    recipientId: string,
    status: RecipientStatus['status'],
    error?: string,
    errorRetries?: number,
    errorProviderMessage?: string,
    errorDetails?: string[] | ((prev: string[] | undefined) => string[])
  ) => void;
  setRecipientStatuses: Dispatch<SetStateAction<RecipientStatus[]>>;
  setIsSubmitting: Dispatch<SetStateAction<boolean>>;
  setModalBoostMessageError: (params: BoostMessageModalParams) => void;
  onBoostSuccess?: () => void;
};

const buildCustomRecordsForRecipient = (
  blipPayload: string | null,
  recipient: PaymentRecipient
): Record<string, string> | undefined =>
  buildCustomRecords(blipPayload, recipient.custom_key, recipient.custom_value);

/** V4vProviderFailure shape (reason = provider response body message when present). */
type ProviderFailureLike = { status?: number; reason?: string; retries?: number };

/**
 * Extract a user-facing message from a thrown value (e.g. Error, response body).
 * Checks Error.message, response.data (message/reason/detail), data.message, and
 * top-level reason/message so we display whatever the provider or LNURL layer sends.
 */
function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && typeof error.message === 'string' && error.message.trim() !== '') {
    return error.message.trim();
  }
  const withResponse = error as {
    response?: { data?: { message?: string; reason?: string; detail?: string } };
  };
  const responseData = withResponse?.response?.data;
  if (typeof responseData === 'object' && responseData !== null) {
    const msg =
      (typeof responseData.message === 'string' && responseData.message.trim() !== ''
        ? responseData.message.trim()
        : undefined) ??
      (typeof responseData.reason === 'string' && responseData.reason.trim() !== ''
        ? responseData.reason.trim()
        : undefined) ??
      (typeof responseData.detail === 'string' && responseData.detail.trim() !== ''
        ? responseData.detail.trim()
        : undefined);
    if (msg !== undefined) return msg;
  }
  const withData = error as { data?: { message?: string; reason?: string; error?: string } };
  const data = withData?.data;
  if (typeof data === 'object' && data !== null) {
    const dataMsg =
      (typeof data.message === 'string' && data.message.trim() !== ''
        ? data.message.trim()
        : undefined) ??
      (typeof data.reason === 'string' && data.reason.trim() !== ''
        ? data.reason.trim()
        : undefined) ??
      (typeof data.error === 'string' && data.error.trim() !== '' ? data.error.trim() : undefined);
    if (dataMsg !== undefined) return dataMsg;
  }
  const withMessage = error as { message?: string };
  if (typeof withMessage?.message === 'string' && withMessage.message.trim() !== '') {
    return withMessage.message.trim();
  }
  const withReason = error as { reason?: string };
  if (typeof withReason?.reason === 'string' && withReason.reason.trim() !== '') {
    return withReason.reason.trim();
  }
  return fallback;
}

export const useBoostPayments = ({
  channel,
  item,
  config,
  tValue,
  message,
  yourName,
  metaBoost,
  totalAmountToCreator,
  totalAmountToApp,
  paymentRecipients,
  toRecipientStatuses,
  updateRecipientStatus,
  setRecipientStatuses,
  setIsSubmitting,
  setModalBoostMessageError,
  onBoostSuccess,
}: UseBoostPaymentsParams) => {
  const sendPayments = async (desc: string | null, allowBlipFallback: boolean) => {
    const provider = await ensureWeblnEnabled();
    if (!provider) {
      setRecipientStatuses(
        toRecipientStatuses(paymentRecipients).map((recipient) => ({
          ...recipient,
          status: 'failed',
          error: 'WebLN wallet not available.',
        }))
      );
      setIsSubmitting(false);
      return;
    }

    const totalMsat = Math.max(0, Math.round((totalAmountToCreator + totalAmountToApp) * 1000));

    setRecipientStatuses(toRecipientStatuses(paymentRecipients));

    let anyFailed = false;
    for (const recipient of paymentRecipients) {
      if (recipient.final_amount <= 0) {
        continue;
      }
      try {
        if (recipient.type === 'lightning' && recipient.recipient_type === 'lnaddress') {
          updateRecipientStatus(recipient.id, 'paying');
          await sendLnaddressPayment({
            recipientAddress: recipient.address,
            amountMsat: Math.max(0, Math.round(recipient.final_amount * 1000)),
            desc,
            provider,
            onAttemptFailed: (_, message) => {
              updateRecipientStatus(
                recipient.id,
                'paying',
                undefined,
                undefined,
                undefined,
                (prev) => [...(prev ?? []), message]
              );
            },
          });
        } else if (recipient.type === 'lightning' && recipient.recipient_type === 'node') {
          updateRecipientStatus(recipient.id, 'paying');
          const amountMsat = Math.max(0, Math.round(recipient.final_amount * 1000));
          const shouldIncludeBlip = desc !== null || allowBlipFallback;
          const effectiveMessage = allowBlipFallback ? '' : message;
          const effectiveSenderName = allowBlipFallback ? '' : yourName.trim();
          const blipMessage = buildBlipMessage(desc, allowBlipFallback, effectiveMessage);
          const blipPayload = shouldIncludeBlip
            ? serializeBlip10Metadata(
                buildBlip10Metadata({
                  action: 'boost',
                  value_msat_total: totalMsat,
                  value_msat: amountMsat,
                  app_name: config.public.brand.name,
                  sender_name: effectiveSenderName || undefined,
                  message: blipMessage,
                  guid: channel?.podcast_guid ?? undefined,
                  podcast: channel?.title ?? undefined,
                  episode: item?.title ?? undefined,
                  episode_guid: item?.guid ?? undefined,
                  name: recipient.name ?? undefined,
                })
              )
            : null;
          const customRecords = buildCustomRecordsForRecipient(blipPayload, recipient);
          await sendKeysendPayment({
            destination: recipient.address,
            amountSats: Math.max(0, Math.round(recipient.final_amount)),
            customRecords,
            provider,
          });
        } else {
          throw new Error('Unsupported recipient type.');
        }
        updateRecipientStatus(recipient.id, 'success');
      } catch (error) {
        anyFailed = true;
        // In-wallet payment failure reasons (e.g. RecipientRejected, 400) may not be available
        // if the WebLN provider only rejects when the user cancels; we display whatever the
        // provider includes on the rejected Promise (or LNURL layer attaches via providerFailure).
        if (process.env.NODE_ENV === 'development') {
          console.warn('Boost payment error', error);
        }
        const isTimeoutOrCancel =
          (error !== null &&
            error !== undefined &&
            (error as { code?: string }).code === 'ERR_CANCELED') ||
          (error instanceof Error &&
            (error.message === 'canceled' || error.message === 'Request aborted'));
        const providerFailure = (error as Record<string, ProviderFailureLike | undefined>)?.[
          PROVIDER_FAILURE_PROP
        ];
        const errorRetries =
          providerFailure !== undefined && providerFailure !== null
            ? providerFailure.retries
            : undefined;
        const responseBodyMessage = (error as { response?: { data?: { message?: string } } })
          ?.response?.data?.message;
        const errorProviderMessage =
          providerFailure !== undefined &&
          providerFailure !== null &&
          typeof providerFailure.reason === 'string' &&
          providerFailure.reason.trim() !== ''
            ? providerFailure.reason.trim()
            : typeof responseBodyMessage === 'string' && responseBodyMessage.trim() !== ''
              ? responseBodyMessage.trim()
              : undefined;
        const axiosStatus = (error as { response?: { status?: number } })?.response?.status;
        const genericByStatus =
          providerFailure !== undefined &&
          providerFailure !== null &&
          providerFailure.status !== undefined
            ? `Request failed with status code ${providerFailure.status}`
            : axiosStatus !== undefined
              ? `Request failed with status code ${axiosStatus}`
              : tValue('boost_messages.status_failed');
        let errorMessage = isTimeoutOrCancel
          ? tValue('boost_messages.invoice_timeout')
          : getErrorMessage(error, genericByStatus);
        if (errorRetries !== undefined && errorRetries > 0) {
          const attemptNumber = errorRetries + 1;
          errorMessage =
            tValue('boost_messages.retry_attempt', { number: attemptNumber }) + errorMessage;
        }
        updateRecipientStatus(
          recipient.id,
          'failed',
          errorMessage,
          errorRetries,
          errorProviderMessage
        );
      }
    }

    if (!anyFailed) {
      onBoostSuccess?.();
    }
    setIsSubmitting(false);
  };

  const handleSubmitBoost = async () => {
    setIsSubmitting(true);
    const allowBlipFallback = !metaBoost;

    if (metaBoost) {
      try {
        const totalMsat = Math.max(0, Math.round((totalAmountToCreator + totalAmountToApp) * 1000));
        const requestBody = buildBoostMetadataRequest({
          action: 'boost',
          split: 1,
          value_msat: totalMsat,
          value_msat_total: totalMsat,
          message: message.trim() || undefined,
          app_name: config.public.brand.name,
          sender_name: yourName.trim() || undefined,
          feed_guid: channel?.podcast_guid ?? undefined,
          feed_title: channel?.title ?? undefined,
          item_guid: item?.guid ?? undefined,
          item_title: item?.title ?? undefined,
        });

        const requestUrl =
          metaBoost.schema === META_BOOST_SCHEMA_BOOSTBOX
            ? getMetaboostBoostboxBoostUrl(config)
            : null;
        if (metaBoost.schema === META_BOOST_SCHEMA_BOOSTBOX && requestUrl === null) {
          throw new Error('BoostBox proxy URL not configured');
        }
        const url = requestUrl !== null ? requestUrl : metaBoost.node;
        if (metaBoost.schema === META_BOOST_SCHEMA_BOOSTBOX && metaBoost.node === null) {
          throw new Error('BoostBox metaBoost node is missing');
        }
        const requestData =
          metaBoost.schema === META_BOOST_SCHEMA_BOOSTBOX
            ? { baseUrl: metaBoost.node, ...requestBody }
            : requestBody;

        const { status, data: responseData } = await request<unknown>(url, {
          data: requestData,
          method: 'POST',
        });

        if (status < 200 || status >= 300) {
          throw new Error('BoostBox request failed');
        }

        if (!isBoostMetadataResponse(responseData)) {
          throw new Error('Invalid BoostBox response');
        }

        await sendPayments(responseData.desc, false);
        return;
      } catch (error) {
        console.error(error);
        setIsSubmitting(false);
        setModalBoostMessageError({
          title: tValue('boost_messages.server_error_title'),
          message: tValue('boost_messages.server_error_message'),
          onSendAnyway: () => {
            setIsSubmitting(true);
            void sendPayments(null, false);
          },
          onCancel: () => {
            setIsSubmitting(false);
          },
        });
        return;
      }
    }

    await sendPayments(null, allowBlipFallback);
  };

  return { handleSubmitBoost, sendPayments };
};
