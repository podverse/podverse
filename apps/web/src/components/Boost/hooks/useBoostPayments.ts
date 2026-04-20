import type { Dispatch, SetStateAction } from 'react';
import { useCallback } from 'react';

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
import { PROVIDER_FAILURE_PROP, sortRecipientsBySplitDescending } from '@podverse/v4v-helpers';
import type { MetaBoost } from '@podverse/v4v-metaboost';
import {
  MetaboostSenderBlockedPostError,
  resolveBoostExecutionStrategy,
  V4V_ACTION_TYPE,
} from '@podverse/v4v-metaboost';

import { useModals } from '../../../contexts/Modals';
import { getApiRequestService } from '../../../factories/apiRequestService';
import { ensureWeblnEnabled } from '../../../utils/value/webln';
import type { MbrssV1RssContext } from '../donateMbrssV1RssContext';
import { buildCustomRecordsForRecipient } from '../payments/boostBlipCustomRecords';
import { getProviderFailure } from '../payments/boostPaymentProviderFailure';
import {
  getMbrssV1PaymentDesc,
  postMbrssV1BoostMessage,
} from '../payments/mbrssV1/mbrssV1RequestMetadata';
import { postMbV1BoostMessage } from '../payments/mbV1/mbV1RequestMetadata';
import type { PaymentRecipient, RecipientStatus } from '../types.js';
import { convertBoostThresholdAmount } from './boostThresholdConversion';

type Translator = (key: string, values?: Record<string, string | number>) => string;

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
  mbrssV1RssContext?: MbrssV1RssContext | null;
  config: BoostPaymentAppConfig;
  tValue: Translator;
  message: string;
  yourName: string;
  metaBoost: MetaBoost | null;
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
  onBoostSuccess?: () => void;
  /** mbrss-v1 HTTP POST after payment only when GET capability succeeded; Lightning still runs if false. */
  mbrssV1HttpMessagingEnabled: boolean;
  /** From `GET /auth/me` only; required to complete mbrss-v1 ingest (with sender_guid). */
  mbrssV1SenderGuid: string | null;
  sourceAmountMinor: number;
  sourceCurrency: string | null;
  sourceAmountUnit: string | null;
  thresholdPreferredCurrency: string | null;
  thresholdMinimumMessageAmountMinor: number | null;
  thresholdConversionEndpointUrl: string | null;
  /** When false, `submitBoost` is a no-op (no WebLN / Lightning). */
  isLoggedIn: boolean;
};

const sumRecipientFinalAmountSats = (recipients: PaymentRecipient[]): number =>
  recipients.reduce((sum, recipient) => sum + recipient.final_amount, 0);

export const useBoostPayments = ({
  channel,
  item,
  mbrssV1RssContext,
  config,
  tValue,
  message,
  yourName,
  metaBoost,
  paymentRecipients,
  toRecipientStatuses,
  updateRecipientStatus,
  setRecipientStatuses,
  setIsSubmitting,
  onBoostSuccess,
  mbrssV1HttpMessagingEnabled,
  mbrssV1SenderGuid,
  sourceAmountMinor,
  sourceCurrency,
  sourceAmountUnit,
  thresholdPreferredCurrency,
  thresholdMinimumMessageAmountMinor,
  thresholdConversionEndpointUrl,
  isLoggedIn,
}: UseBoostPaymentsParams) => {
  const { setModalBoostMessageError, setModalBoostMintRateLimit } = useModals();

  const promptMetaboostUnreachable = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      setModalBoostMessageError({
        title: tValue('boost_messages.mbrss_offline_modal_title'),
        message: tValue('boost_messages.mbrss_offline_modal_body'),
        primaryActionI18nKey: 'boost_messages.mbrss_offline_continue',
        onSendAnyway: () => resolve(),
        onCancel: () => resolve(),
      });
    });
  }, [setModalBoostMessageError, tValue]);
  const promptThresholdBelowMinimum = useCallback(
    (onSendWithoutMessage: () => void): void => {
      setModalBoostMessageError({
        title: tValue('boost_messages.threshold_below_minimum_modal_title'),
        message: tValue('boost_messages.threshold_below_minimum_modal_body'),
        primaryActionI18nKey: 'boost_messages.threshold_send_without_message',
        onSendAnyway: onSendWithoutMessage,
        onCancel: () => {},
      });
    },
    [setModalBoostMessageError, tValue]
  );

  const resolvedBlipFeedGuid = mbrssV1RssContext?.feedGuid ?? channel?.podcast_guid ?? undefined;
  const resolvedBlipFeedTitle = mbrssV1RssContext?.feedTitle ?? channel?.title ?? undefined;
  const resolvedBlipItemGuid = mbrssV1RssContext?.itemGuid ?? item?.guid ?? undefined;
  const resolvedBlipItemTitle = mbrssV1RssContext?.itemTitle ?? item?.title ?? undefined;
  const getLargestSplitRecipient = (): PaymentRecipient | null => {
    let largest: PaymentRecipient | null = null;
    for (const recipient of paymentRecipients) {
      if (recipient.final_amount <= 0) {
        continue;
      }
      const recipientSplit = recipient.normalized_split ?? recipient.split ?? 0;
      const currentSplit = largest?.normalized_split ?? largest?.split ?? 0;
      if (largest === null || recipientSplit > currentSplit) {
        largest = recipient;
      }
    }
    return largest;
  };

  const sendPayments = async (
    desc: string | null,
    effectiveMessage: string,
    allowBlipFallback: boolean,
    shouldPostMetaboostStandard: boolean,
    omitBlipMetadataInKeysend: boolean,
    useMbV1Post: boolean
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
      setIsSubmitting(false);
      return;
    }

    const totalSatsPlanned = sumRecipientFinalAmountSats(paymentRecipients);
    const totalMsat = Math.max(0, Math.round(totalSatsPlanned * 1000));

    const orderedRecipients = sortRecipientsBySplitDescending(paymentRecipients);

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
    for (const recipient of orderedRecipients) {
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
          const shouldIncludeBlip =
            !omitBlipMetadataInKeysend && (desc !== null || allowBlipFallback);
          const effectiveBlipMessage = allowBlipFallback ? '' : effectiveMessage;
          const effectiveSenderName = allowBlipFallback ? '' : yourName.trim();
          const blipMessage = buildBlipMessage(desc, allowBlipFallback, effectiveBlipMessage);
          const blipPayload = shouldIncludeBlip
            ? serializeBlip10Metadata(
                buildBlip10Metadata({
                  action: V4V_ACTION_TYPE.BOOST,
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

    if (
      shouldPostMetaboostStandard &&
      metaBoost !== null &&
      mbrssV1SenderGuid !== null &&
      mbrssV1SenderGuid !== ''
    ) {
      const largestRecipient = getLargestSplitRecipient();
      const largestRecipientStatus = finalRecipientStatuses.find(
        (recipient) => recipient.id === largestRecipient?.id
      );
      if (largestRecipientStatus?.status === 'success') {
        try {
          if (useMbV1Post) {
            await postMbV1BoostMessage({
              appName: config.public.brand.name,
              message: effectiveMessage,
              yourName,
              metaBoost,
              metaboostTotalMsat: totalMsat,
              senderGuid: mbrssV1SenderGuid,
              onMetaboostUnreachable: promptMetaboostUnreachable,
            });
          } else {
            await postMbrssV1BoostMessage({
              channel,
              item,
              mbrssV1RssContext,
              appName: config.public.brand.name,
              message: effectiveMessage,
              yourName,
              metaBoost,
              metaboostTotalMsat: totalMsat,
              senderGuid: mbrssV1SenderGuid,
              onMetaboostUnreachable: promptMetaboostUnreachable,
            });
          }
        } catch (error: unknown) {
          if (error instanceof MetaboostSenderBlockedPostError) {
            setModalBoostMessageError({
              title: tValue('boost_messages.sender_blocked_modal_title'),
              message:
                error.detailMessage.trim() !== ''
                  ? error.detailMessage
                  : tValue('boost_messages.sender_blocked_post_fallback'),
              primaryActionI18nKey: 'boost_messages.sender_blocked_modal_primary',
              onSendAnyway: () => {},
              onCancel: () => {},
            });
            return;
          }
          if (process.env.NODE_ENV === 'development') {
            console.warn('MetaBoost standard post failed', error);
          }
        }
      }
    }

    if (!anyFailed) {
      onBoostSuccess?.();
    }
    setIsSubmitting(false);
  };

  const submitBoost = async (omitMessage: boolean): Promise<void> => {
    const effectiveMessage = omitMessage ? '' : message;
    setIsSubmitting(true);
    if (!isLoggedIn) {
      setIsSubmitting(false);
      return;
    }
    const { shouldUseMbrssV1, shouldUseMbV1, allowBlipFallback } =
      resolveBoostExecutionStrategy(metaBoost);
    const normalizedSourceCurrency = sourceCurrency?.trim() ?? '';
    const normalizedSourceAmountUnit = sourceAmountUnit?.trim() ?? '';
    const normalizedThresholdPreferredCurrency = thresholdPreferredCurrency?.trim() ?? '';
    const normalizedThresholdConversionEndpointUrl = thresholdConversionEndpointUrl?.trim() ?? '';

    if ((shouldUseMbrssV1 || shouldUseMbV1) && metaBoost !== null) {
      if (mbrssV1HttpMessagingEnabled && mbrssV1SenderGuid !== null && mbrssV1SenderGuid !== '') {
        try {
          const rateStatus = await getApiRequestService().reqMetaboostMbrssV1MintRateLimitStatus();
          if (!rateStatus.allowed) {
            const ms = rateStatus.retryAfterMs;
            const sec = Math.ceil(ms / 1000);
            const bodyMessage =
              sec <= 90
                ? tValue('boost_messages.mint_rate_limit_wait_seconds', { seconds: sec })
                : tValue('boost_messages.mint_rate_limit_wait_minutes', {
                    minutes: Math.max(1, Math.ceil(ms / 60000)),
                  });
            setModalBoostMintRateLimit({ message: bodyMessage });
            setIsSubmitting(false);
            return;
          }
        } catch {
          setModalBoostMintRateLimit({
            message: tValue('boost_messages.mint_rate_limit_preflight_error'),
          });
          setIsSubmitting(false);
          return;
        }
      }
      const thresholdAmountMinor = thresholdMinimumMessageAmountMinor ?? 0;
      if (
        !omitMessage &&
        effectiveMessage.trim() !== '' &&
        mbrssV1HttpMessagingEnabled &&
        thresholdAmountMinor > 0 &&
        normalizedSourceCurrency !== '' &&
        normalizedSourceAmountUnit !== '' &&
        normalizedThresholdPreferredCurrency !== '' &&
        normalizedThresholdConversionEndpointUrl !== ''
      ) {
        const conversionResult = await convertBoostThresholdAmount({
          sourceCurrency: normalizedSourceCurrency,
          sourceAmountMinor: Math.max(0, Math.round(sourceAmountMinor)),
          sourceAmountUnit: normalizedSourceAmountUnit,
          context: {
            preferredCurrency: normalizedThresholdPreferredCurrency,
            minimumMessageAmountMinor: thresholdAmountMinor,
            conversionEndpointUrl: normalizedThresholdConversionEndpointUrl,
          },
        });

        if (conversionResult.ok && conversionResult.target.amountMinor < thresholdAmountMinor) {
          setIsSubmitting(false);
          promptThresholdBelowMinimum(() => {
            void submitBoost(true);
          });
          return;
        }
      }
      const desc = getMbrssV1PaymentDesc(effectiveMessage, config.public.brand.name);
      await sendPayments(
        desc,
        effectiveMessage,
        false,
        mbrssV1HttpMessagingEnabled,
        true,
        shouldUseMbV1
      );
      return;
    }

    await sendPayments(null, effectiveMessage, allowBlipFallback, false, false, false);
  };

  const handleSubmitBoost = async () => {
    await submitBoost(false);
  };

  return { handleSubmitBoost, sendPayments };
};
