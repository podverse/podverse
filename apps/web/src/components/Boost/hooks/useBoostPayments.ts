import type { Dispatch, SetStateAction } from 'react';

import type { DTOChannel, DTOItem } from '@podverse/helpers';
import type { MetaBoost } from '@podverse/helpers-v4v';
import {
  buildBlipMessage,
  buildBlip10Metadata,
  buildCustomRecords,
  buildBoostMetadataRequest,
  isBoostMetadataResponse,
  resolveLnaddressKeysendDetails,
  serializeBlip10Metadata,
  toCustomRecords,
} from '@podverse/helpers-v4v';
import { sendKeysendPayment, sendLnaddressPayment } from '@podverse/helpers-v4v-web';
import { request } from '@podverse/helpers-requests';

import type { PaymentRecipient, RecipientStatus } from '../types.js';
import { ensureWeblnEnabled } from '../../../utils/value/webln';

type Translator = (key: string, values?: Record<string, string | number>) => string;

type AppConfig = {
  public: {
    brand: {
      name: string;
    };
  };
};

type BoostMessageModalParams = {
  title: string;
  message: string;
  onSendAnyway: () => void;
  onCancel: () => void;
};

type UseBoostPaymentsParams = {
  channel: DTOChannel;
  item: DTOItem | null;
  config: AppConfig;
  tValue: Translator;
  message: string;
  yourName: string;
  metaBoost: MetaBoost | null;
  selectedMethod: string | null;
  totalAmountToCreator: number;
  totalAmountToApp: number;
  paymentRecipients: PaymentRecipient[];
  toRecipientStatuses: (recipients: PaymentRecipient[]) => RecipientStatus[];
  updateRecipientStatus: (
    recipientId: string,
    status: RecipientStatus['status'],
    error?: string
  ) => void;
  setRecipientStatuses: Dispatch<SetStateAction<RecipientStatus[]>>;
  setIsSubmitting: Dispatch<SetStateAction<boolean>>;
  setModalBoostMessageError: (params: BoostMessageModalParams) => void;
};

const buildCustomRecordsForRecipient = (
  blipPayload: string | null,
  recipient: PaymentRecipient
): Record<string, string> | undefined =>
  buildCustomRecords(blipPayload, recipient.custom_key, recipient.custom_value);

export const useBoostPayments = ({
  channel,
  item,
  config,
  tValue,
  message,
  yourName,
  metaBoost,
  selectedMethod,
  totalAmountToCreator,
  totalAmountToApp,
  paymentRecipients,
  toRecipientStatuses,
  updateRecipientStatus,
  setRecipientStatuses,
  setIsSubmitting,
  setModalBoostMessageError,
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

    for (const recipient of paymentRecipients) {
      try {
        if (recipient.type === 'lnaddress') {
          updateRecipientStatus(recipient.id, 'paying');
          if (selectedMethod === 'keysend') {
            const resolved = await resolveLnaddressKeysendDetails(recipient.address);
            if (!resolved) {
              throw new Error('Unable to resolve LNAddress keysend details.');
            }
            const amountMsat = Math.max(0, Math.round(recipient.final_amount * 1000));
            const shouldIncludeBlip = desc !== null || allowBlipFallback;
            const blipMessage = buildBlipMessage(desc, allowBlipFallback, message);
            const blipPayload = shouldIncludeBlip
              ? serializeBlip10Metadata(
                  buildBlip10Metadata({
                    action: 'boost',
                    value_msat_total: totalMsat,
                    value_msat: amountMsat,
                    app_name: config.public.brand.name,
                    sender_name: yourName.trim() || undefined,
                    message: blipMessage,
                    guid: channel.podcast_guid ?? undefined,
                    podcast: channel.title ?? undefined,
                    episode: item?.title ?? undefined,
                    episode_guid: item?.guid ?? undefined,
                    name: recipient.name ?? undefined,
                  })
                )
              : null;
            const recipientRecords = buildCustomRecordsForRecipient(blipPayload, recipient);
            const keysendRecords = toCustomRecords(resolved.customData);
            const combinedRecords = {
              ...(keysendRecords ?? {}),
              ...(recipientRecords ?? {}),
            };
            const customRecords =
              Object.keys(combinedRecords).length > 0 ? combinedRecords : undefined;
            await sendKeysendPayment({
              destination: resolved.pubkey,
              amountSats: Math.max(0, Math.round(recipient.final_amount)),
              customRecords,
              provider,
            });
          } else {
            await sendLnaddressPayment({
              recipientAddress: recipient.address,
              amountMsat: Math.max(0, Math.round(recipient.final_amount * 1000)),
              desc,
              provider,
            });
          }
        } else if (recipient.type === 'node') {
          if (selectedMethod !== 'keysend') {
            throw new Error('Unsupported recipient type for method.');
          }
          updateRecipientStatus(recipient.id, 'paying');
          const amountMsat = Math.max(0, Math.round(recipient.final_amount * 1000));
          const shouldIncludeBlip = desc !== null || allowBlipFallback;
          const blipMessage = buildBlipMessage(desc, allowBlipFallback, message);
          const blipPayload = shouldIncludeBlip
            ? serializeBlip10Metadata(
                buildBlip10Metadata({
                  action: 'boost',
                  value_msat_total: totalMsat,
                  value_msat: amountMsat,
                  app_name: config.public.brand.name,
                  sender_name: yourName.trim() || undefined,
                  message: blipMessage,
                  guid: channel.podcast_guid ?? undefined,
                  podcast: channel.title ?? undefined,
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
        const errorMessage =
          error instanceof Error ? error.message : tValue('boost_messages.status_failed');
        updateRecipientStatus(recipient.id, 'failed', errorMessage);
      }
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
          feed_guid: channel.podcast_guid ?? undefined,
          feed_title: channel.title ?? undefined,
          item_guid: item?.guid ?? undefined,
          item_title: item?.title ?? undefined,
        });

        const { status, data: responseData } = await request<unknown>(metaBoost.node, {
          data: requestBody,
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
