import type { Dispatch, SetStateAction } from 'react';

import type { DTOChannel, DTOItem } from '@podverse/helpers';
import {
  getErrorCode,
  getErrorMessage,
  getErrorResponseBodyMessage,
  getErrorResponseStatus,
} from '@podverse/helpers';
import {
  buildBlip10Metadata,
  buildBlipMessage,
  sendKeysendPayment,
  sendLnaddressPayment,
  serializeBlip10Metadata,
} from '@podverse/v4v-btc-ln';
import { PROVIDER_FAILURE_PROP } from '@podverse/v4v-helpers';
import type { MetaBoost } from '@podverse/v4v-metaboost';
import { resolveBoostExecutionStrategy } from '@podverse/v4v-metaboost';

import { ensureWeblnEnabled } from '../../../utils/value/webln';
import type { Mb1RssContext } from '../donateMb1RssContext';
import { buildCustomRecordsForRecipient } from '../payments/boostBlipCustomRecords';
import { getProviderFailure } from '../payments/boostPaymentProviderFailure';
import type { Mb1ConfirmTarget } from '../payments/mb1/mb1ConfirmPayment';
import { confirmMb1Payment } from '../payments/mb1/mb1ConfirmPayment';
import { requestMb1Metadata } from '../payments/mb1/mb1RequestMetadata';
import type { PaymentRecipient, RecipientStatus } from '../types.js';

type Translator = (key: string, values?: Record<string, string | number>) => string;

type BoostMessageModalParams = {
  title: string;
  message: string;
  onSendAnyway: () => void;
  onCancel: () => void;
};

type BoostPaymentAppConfig = {
  public: {
    brand: {
      name: string;
    };
  };
};

type UseBoostPaymentsParams = {
  channel: DTOChannel | null;
  item: DTOItem | null;
  mb1RssContext?: Mb1RssContext | null;
  config: BoostPaymentAppConfig;
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

export const useBoostPayments = ({
  channel,
  item,
  mb1RssContext,
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
  const resolvedBlipFeedGuid = mb1RssContext?.feedGuid ?? channel?.podcast_guid ?? undefined;
  const resolvedBlipFeedTitle = mb1RssContext?.feedTitle ?? channel?.title ?? undefined;
  const resolvedBlipItemGuid = mb1RssContext?.itemGuid ?? item?.guid ?? undefined;
  const resolvedBlipItemTitle = mb1RssContext?.itemTitle ?? item?.title ?? undefined;

  const sendPayments = async (
    desc: string | null,
    allowBlipFallback: boolean,
    confirmTarget?: Mb1ConfirmTarget
  ) => {
    const provider = await ensureWeblnEnabled();
    let finalRecipientStatuses = toRecipientStatuses(paymentRecipients);
    if (!provider) {
      finalRecipientStatuses = finalRecipientStatuses.map((recipient) => ({
        ...recipient,
        status: 'failed',
        error: 'WebLN wallet not available.',
      }));
      setRecipientStatuses(finalRecipientStatuses);
      if (confirmTarget !== undefined) {
        await confirmMb1Payment(confirmTarget, finalRecipientStatuses);
      }
      setIsSubmitting(false);
      return;
    }

    const totalMsat = Math.max(0, Math.round((totalAmountToCreator + totalAmountToApp) * 1000));

    setRecipientStatuses(finalRecipientStatuses);
    const setLocalRecipientStatus = (
      recipientId: string,
      status: RecipientStatus['status'],
      error?: string,
      errorRetries?: number,
      errorProviderMessage?: string,
      errorDetails?: string[] | ((prev: string[] | undefined) => string[])
    ) => {
      finalRecipientStatuses = finalRecipientStatuses.map((recipient) => {
        if (recipient.id !== recipientId) {
          return recipient;
        }
        const prevErrorDetails = recipient.errorDetails;
        const nextErrorDetails =
          typeof errorDetails === 'function' ? errorDetails(prevErrorDetails) : errorDetails;
        return {
          ...recipient,
          status,
          error,
          errorRetries,
          errorProviderMessage,
          errorDetails: nextErrorDetails ?? prevErrorDetails,
        };
      });
    };

    let anyFailed = false;
    for (const recipient of paymentRecipients) {
      if (recipient.final_amount <= 0) {
        continue;
      }
      try {
        if (recipient.type === 'lightning' && recipient.recipient_type === 'lnaddress') {
          updateRecipientStatus(recipient.id, 'paying');
          setLocalRecipientStatus(recipient.id, 'paying');
          await sendLnaddressPayment({
            recipientAddress: recipient.address,
            amountMsat: Math.max(0, Math.round(recipient.final_amount * 1000)),
            desc,
            provider,
            onAttemptFailed: (_, attemptMessage) => {
              updateRecipientStatus(
                recipient.id,
                'paying',
                undefined,
                undefined,
                undefined,
                (prev) => [...(prev ?? []), attemptMessage]
              );
              setLocalRecipientStatus(
                recipient.id,
                'paying',
                undefined,
                undefined,
                undefined,
                (prev) => [...(prev ?? []), attemptMessage]
              );
            },
          });
        } else if (recipient.type === 'lightning' && recipient.recipient_type === 'node') {
          updateRecipientStatus(recipient.id, 'paying');
          setLocalRecipientStatus(recipient.id, 'paying');
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
                  guid: resolvedBlipFeedGuid,
                  podcast: resolvedBlipFeedTitle,
                  episode: resolvedBlipItemTitle,
                  episode_guid: resolvedBlipItemGuid,
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
        setLocalRecipientStatus(recipient.id, 'success');
      } catch (error) {
        anyFailed = true;
        if (process.env.NODE_ENV === 'development') {
          console.warn('Boost payment error', error);
        }
        const isTimeoutOrCancel =
          getErrorCode(error) === 'ERR_CANCELED' ||
          (error instanceof Error &&
            (error.message === 'canceled' || error.message === 'Request aborted'));
        const providerFailure = getProviderFailure(error, PROVIDER_FAILURE_PROP);
        const errorRetries =
          providerFailure !== undefined && providerFailure !== null
            ? providerFailure.retries
            : undefined;
        const responseBodyMessage = getErrorResponseBodyMessage(error);
        const errorProviderMessage =
          providerFailure !== undefined &&
          providerFailure !== null &&
          typeof providerFailure.reason === 'string' &&
          providerFailure.reason.trim() !== ''
            ? providerFailure.reason.trim()
            : typeof responseBodyMessage === 'string' && responseBodyMessage.trim() !== ''
              ? responseBodyMessage.trim()
              : undefined;
        const axiosStatus = getErrorResponseStatus(error);
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
        setLocalRecipientStatus(
          recipient.id,
          'failed',
          errorMessage,
          errorRetries,
          errorProviderMessage
        );
      }
    }

    if (confirmTarget !== undefined) {
      await confirmMb1Payment(confirmTarget, finalRecipientStatuses);
    }

    if (!anyFailed) {
      onBoostSuccess?.();
    }
    setIsSubmitting(false);
  };

  const handleSubmitBoost = async () => {
    setIsSubmitting(true);
    const { shouldUseMb1, allowBlipFallback } = resolveBoostExecutionStrategy(metaBoost);

    if (shouldUseMb1 && metaBoost !== null) {
      try {
        const metadata = await requestMb1Metadata({
          channel,
          item,
          mb1RssContext,
          appName: config.public.brand.name,
          message,
          yourName,
          metaBoost,
          totalAmountToCreator,
          totalAmountToApp,
        });
        await sendPayments(metadata.desc, false, {
          messageGuid: metadata.messageGuid,
          confirmUrl: metadata.confirmUrl,
        });
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
