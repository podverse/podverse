import type { AlbyLnurlDetailsResponse } from '@podverse/external-services-alby';
import { fetchLnurlDetails, fetchLnurlInvoice } from '@podverse/external-services-alby';

export type WeblnKeysendOptions = {
  destination: string;
  amount: number;
  customRecords?: Record<string, string>;
};

export type WeblnProvider = {
  sendPayment: (invoice: string) => Promise<unknown>;
  keysend?: (options: WeblnKeysendOptions) => Promise<unknown>;
};

export type SendLnaddressPaymentParams = {
  recipientAddress: string;
  amountMsat: number;
  desc: string | null;
  provider: WeblnProvider;
};

export type SendKeysendPaymentParams = {
  destination: string;
  amountSats: number;
  customRecords?: Record<string, string>;
  provider: WeblnProvider;
};

export const getLnurlComment = (
  details: AlbyLnurlDetailsResponse,
  desc: string | null
): string | undefined => {
  if (!desc) {
    return undefined;
  }
  if (details.commentAllowed === undefined) {
    return undefined;
  }
  return desc.length <= details.commentAllowed ? desc : undefined;
};

export const sendLnaddressPayment = async ({
  recipientAddress,
  amountMsat,
  desc,
  provider,
}: SendLnaddressPaymentParams): Promise<void> => {
  const lnurlDetails = await fetchLnurlDetails({ lnurlOrAddress: recipientAddress });
  if (!lnurlDetails) {
    throw new Error('Unable to resolve LNURL details.');
  }
  if (amountMsat < lnurlDetails.minSendable || amountMsat > lnurlDetails.maxSendable) {
    throw new Error('Payment amount outside LNURL limits.');
  }
  const comment = getLnurlComment(lnurlDetails, desc);
  const invoice = await fetchLnurlInvoice({
    lnurlOrAddress: recipientAddress,
    amountMsat,
    comment,
  });
  if (!invoice?.pr) {
    throw new Error('Unable to fetch LNURL invoice.');
  }
  await provider.sendPayment(invoice.pr);
};

export const sendKeysendPayment = async ({
  destination,
  amountSats,
  customRecords,
  provider,
}: SendKeysendPaymentParams): Promise<void> => {
  if (!provider.keysend) {
    throw new Error('WebLN keysend is not available.');
  }
  await provider.keysend({
    destination,
    amount: amountSats,
    customRecords,
  });
};
