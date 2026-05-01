'use client';

import { useEffect, useState } from 'react';

import type { MetaBoost } from '@podverse/v4v-metaboost';
import { fetchMbrssV1BoostCapability, fetchMbV1BoostCapability } from '@podverse/v4v-metaboost';

/**
 * Max length for boost message text on the **bLIP-0010 BTC/LN** (keysend TLV) path when no
 * `podcast:metaBoost` tag is present. When mbrss-v1 is available, use capability `message_char_limit`
 * instead.
 */
export const BLIP0010_BTC_LN_BOOST_MESSAGE_CHAR_LIMIT = 400;

export type MbrssV1BoostCapabilityStatus = 'idle' | 'loading' | 'success' | 'error';

export type UseMbrssV1BoostCapabilityResult = {
  status: MbrssV1BoostCapabilityStatus;
  messageCharLimit: number | null;
  termsOfServiceUrl: string | null;
  publicMessagesUrl: string | null;
  senderBlocked: boolean;
  senderBlockMessage: string | null;
  preferredCurrency: string | null;
  conversionEndpointUrl: string | null;
};

export type UseMbrssV1BoostCapabilityOptions = {
  /**
   * When false, skip GET capability for MetaBoost (no loading state, no network).
   * When true, loads baseline currency, conversion endpoint, message limits, etc.
   */
  fetchEnabled?: boolean;
  /** Passed as `sender_guid` query on capability GET so MetaBoost can return `sender_blocked`. */
  senderGuid?: string | null;
};

/**
 * When `metaBoost` is set (mbrss-v1 / mb-v1), GET capability for `message_char_limit` and
 * `terms_of_service_url`.
 * When `metaBoost` is null (Blip0010 BTC/LN path only), skip network — caller uses
 * {@link BLIP0010_BTC_LN_BOOST_MESSAGE_CHAR_LIMIT}.
 */
export const useMbrssV1BoostCapability = (
  metaBoost: MetaBoost | null,
  options?: UseMbrssV1BoostCapabilityOptions
): UseMbrssV1BoostCapabilityResult => {
  const fetchEnabled = options?.fetchEnabled ?? true;
  const senderGuid = options?.senderGuid ?? null;

  const [status, setStatus] = useState<MbrssV1BoostCapabilityStatus>(() => {
    if (metaBoost === null) {
      return 'idle';
    }
    return fetchEnabled ? 'loading' : 'idle';
  });
  const [messageCharLimit, setMessageCharLimit] = useState<number | null>(null);
  const [termsOfServiceUrl, setTermsOfServiceUrl] = useState<string | null>(null);
  const [publicMessagesUrl, setPublicMessagesUrl] = useState<string | null>(null);
  const [senderBlocked, setSenderBlocked] = useState(false);
  const [senderBlockMessage, setSenderBlockMessage] = useState<string | null>(null);
  const [preferredCurrency, setPreferredCurrency] = useState<string | null>(null);
  const [conversionEndpointUrl, setConversionEndpointUrl] = useState<string | null>(null);

  useEffect(() => {
    if (metaBoost === null) {
      setStatus('idle');
      setMessageCharLimit(null);
      setTermsOfServiceUrl(null);
      setPublicMessagesUrl(null);
      setSenderBlocked(false);
      setSenderBlockMessage(null);
      setPreferredCurrency(null);
      setConversionEndpointUrl(null);
      return;
    }

    if (!fetchEnabled) {
      setStatus('idle');
      setMessageCharLimit(null);
      setTermsOfServiceUrl(null);
      setPublicMessagesUrl(null);
      setSenderBlocked(false);
      setSenderBlockMessage(null);
      setPreferredCurrency(null);
      setConversionEndpointUrl(null);
      return;
    }

    let cancelled = false;
    setStatus('loading');
    setMessageCharLimit(null);
    setTermsOfServiceUrl(null);
    setPublicMessagesUrl(null);
    setSenderBlocked(false);
    setSenderBlockMessage(null);
    setPreferredCurrency(null);
    setConversionEndpointUrl(null);

    void (async () => {
      try {
        const node = metaBoost.node;
        const isMbV1 =
          metaBoost.standard === 'mb-v1' ||
          (typeof node === 'string' && node.includes('/standard/mb-v1/'));
        const capOptions = { senderGuid };
        const result = isMbV1
          ? await fetchMbV1BoostCapability(node, capOptions)
          : await fetchMbrssV1BoostCapability(node, capOptions);
        if (cancelled) {
          return;
        }
        setMessageCharLimit(result.messageCharLimit);
        setTermsOfServiceUrl(result.termsOfServiceUrl);
        setPublicMessagesUrl(result.publicMessagesUrl);
        setSenderBlocked(result.senderBlocked);
        setSenderBlockMessage(result.senderBlockMessage);
        setPreferredCurrency(result.preferredCurrency);
        setConversionEndpointUrl(result.conversionEndpointUrl);
        setStatus('success');
      } catch {
        if (cancelled) {
          return;
        }
        setMessageCharLimit(null);
        setTermsOfServiceUrl(null);
        setPublicMessagesUrl(null);
        setSenderBlocked(false);
        setSenderBlockMessage(null);
        setPreferredCurrency(null);
        setConversionEndpointUrl(null);
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [metaBoost, fetchEnabled, senderGuid]);

  return {
    status,
    messageCharLimit,
    termsOfServiceUrl,
    publicMessagesUrl,
    senderBlocked,
    senderBlockMessage,
    preferredCurrency,
    conversionEndpointUrl,
  };
};
