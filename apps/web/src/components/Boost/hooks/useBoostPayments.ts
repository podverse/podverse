import type { Dispatch, SetStateAction } from 'react';
import { useCallback } from 'react';

import type { DTOChannel, DTOItem } from '@podverse/helpers';
import {
  getErrorCode,
  getErrorMessage,
  getErrorResponseBodyCode,
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
  METABOOST_OWNER_TERMS_NOT_ACCEPTED_CURRENT_CODE,
  MetaboostCapabilityPreflightError,
  MetaboostOwnerTermsNotAcceptedPostError,
  MetaboostSenderBlockedPostError,
  resolveBoostExecutionStrategy,
  V4V_ACTION_TYPE,
} from '@podverse/v4v-metaboost';

import { useModals } from '../../../contexts/Modals';
import { getApiRequestService } from '../../../factories/apiRequestService';
import { ensureWeblnEnabled } from '../../../utils/value/webln';
import type { BoostPaymentScope } from '../boostPaymentScope';
import { buildCustomRecordsForRecipient } from '../payments/boostBlipCustomRecords';
import { getProviderFailure } from '../payments/boostPaymentProviderFailure';
import {
  getMbrssV1PaymentDesc,
  postMbrssV1BoostMessage,
} from '../payments/mbrssV1/mbrssV1RequestMetadata';
import { postMbV1BoostMessage } from '../payments/mbV1/mbV1RequestMetadata';
import type { PaymentRecipient, RecipientStatus } from '../types.js';
import { shouldAttemptMetaBoostStandardPost } from './metaBoostStandardPostAttempt.js';

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
  /** `app_only` = /donate: only Lightning + mb-v1 HTTP post, never mbrss-v1. */
  boostPaymentScope: BoostPaymentScope;
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
  /** When false, `submitBoost` is a no-op (no WebLN / Lightning). */
  isLoggedIn: boolean;
};

const sumRecipientFinalAmountSats = (recipients: PaymentRecipient[]): number =>
  recipients.reduce((sum, recipient) => sum + recipient.final_amount, 0);

export const useBoostPayments = ({
  channel,
  item,
  boostPaymentScope,
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

  const resolvedBlipFeedGuid = channel?.podcast_guid ?? undefined;
  const resolvedBlipFeedTitle = channel?.title ?? undefined;
  const resolvedBlipItemGuid = item?.guid ?? undefined;
  const resolvedBlipItemTitle = item?.title ?? undefined;
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
    useMbV1Post: boolean
  ) => {
    try {
      const provider = await ensureWeblnEnabled();
      let finalRecipientStatuses = toRecipientStatuses(paymentRecipients);
      if (!provider) {
        finalRecipientStatuses = finalRecipientStatuses.map((recipient) => ({
          ...recipient,
          status: 'failed',
          error: 'WebLN wallet not available.',
        }));
        setRecipientStatuses(finalRecipientStatuses);
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
      let anyMetaboostPostFailed = false;
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
            const shouldIncludeBlip = desc !== null || allowBlipFallback;
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
            } else if (boostPaymentScope !== 'app_only') {
              await postMbrssV1BoostMessage({
                channel,
                item,
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
            anyMetaboostPostFailed = true;
            if (error instanceof MetaboostCapabilityPreflightError) {
              // Offline prompt has already been shown by request metadata helper.
            } else if (error instanceof MetaboostSenderBlockedPostError) {
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
            } else if (error instanceof MetaboostOwnerTermsNotAcceptedPostError) {
              setModalBoostMessageError({
                title: tValue('boost_messages.owner_terms_not_accepted_modal_title'),
                message:
                  error.detailMessage.trim() !== ''
                    ? error.detailMessage
                    : tValue('boost_messages.owner_terms_not_accepted_post_fallback'),
                primaryActionI18nKey: 'boost_messages.owner_terms_not_accepted_modal_primary',
                onSendAnyway: () => {},
                onCancel: () => {},
              });
            } else {
              const responseCode = getErrorResponseBodyCode(error);
              const responseMessage = getErrorResponseBodyMessage(error);
              const trimmedMessage =
                typeof responseMessage === 'string' && responseMessage.trim() !== ''
                  ? responseMessage.trim()
                  : null;
              const message =
                trimmedMessage !== null
                  ? trimmedMessage
                  : responseCode === METABOOST_OWNER_TERMS_NOT_ACCEPTED_CURRENT_CODE
                    ? tValue('boost_messages.owner_terms_not_accepted_post_fallback')
                    : tValue('boost_messages.metaboost_post_failed_fallback');
              setModalBoostMessageError({
                title: tValue('boost_messages.metaboost_post_failed_modal_title'),
                message,
                primaryActionI18nKey: 'boost_messages.metaboost_post_failed_modal_primary',
                onSendAnyway: () => {},
                onCancel: () => {},
              });
              if (process.env.NODE_ENV === 'development') {
                console.warn('MetaBoost standard post failed', error);
              }
            }
          }
        }
      }

      if (!anyFailed && !anyMetaboostPostFailed) {
        onBoostSuccess?.();
      }
    } finally {
      setIsSubmitting(false);
    }
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
      const shouldPostMetaboostStandard = shouldAttemptMetaBoostStandardPost(
        mbrssV1HttpMessagingEnabled
      );
      const desc = getMbrssV1PaymentDesc(effectiveMessage, config.public.brand.name);
      await sendPayments(desc, effectiveMessage, false, shouldPostMetaboostStandard, shouldUseMbV1);
      return;
    }

    await sendPayments(null, effectiveMessage, allowBlipFallback, false, false);
  };

  const handleSubmitBoost = async () => {
    await submitBoost(false);
  };

  return { handleSubmitBoost, sendPayments };
};
