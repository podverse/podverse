'use client';

import { useEffect, useState } from 'react';

import type { MetaBoost } from '@podverse/v4v-metaboost';
import { fetchMb1BoostCapability } from '@podverse/v4v-metaboost';

/**
 * Max length for boost message text on the **bLIP-0010 BTC/LN** (keysend TLV) path when no MB1
 * `podcast:metaBoost` tag is present. When MB1 is available, use capability `message_char_limit`
 * instead.
 */
export const BLIP0010_BTC_LN_BOOST_MESSAGE_CHAR_LIMIT = 400;

export type Mb1BoostCapabilityStatus = 'idle' | 'loading' | 'success' | 'error';

export type UseMb1BoostCapabilityResult = {
  status: Mb1BoostCapabilityStatus;
  messageCharLimit: number | null;
  termsOfServiceUrl: string | null;
};

/**
 * When `metaBoost` is set (MB1), GET capability for `message_char_limit` and `terms_of_service_url`.
 * When `metaBoost` is null (Blip0010 BTC/LN path only), skip network — caller uses
 * {@link BLIP0010_BTC_LN_BOOST_MESSAGE_CHAR_LIMIT}.
 */
export const useMb1BoostCapability = (metaBoost: MetaBoost | null): UseMb1BoostCapabilityResult => {
  const [status, setStatus] = useState<Mb1BoostCapabilityStatus>(() =>
    metaBoost === null ? 'idle' : 'loading'
  );
  const [messageCharLimit, setMessageCharLimit] = useState<number | null>(null);
  const [termsOfServiceUrl, setTermsOfServiceUrl] = useState<string | null>(null);

  useEffect(() => {
    if (metaBoost === null) {
      setStatus('idle');
      setMessageCharLimit(null);
      setTermsOfServiceUrl(null);
      return;
    }

    let cancelled = false;
    setStatus('loading');
    setMessageCharLimit(null);
    setTermsOfServiceUrl(null);

    void (async () => {
      try {
        const { messageCharLimit: limit, termsOfServiceUrl: tos } = await fetchMb1BoostCapability(
          metaBoost.node
        );
        if (cancelled) {
          return;
        }
        setMessageCharLimit(limit);
        setTermsOfServiceUrl(tos);
        setStatus('success');
      } catch {
        if (cancelled) {
          return;
        }
        setMessageCharLimit(null);
        setTermsOfServiceUrl(null);
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [metaBoost]);

  return { status, messageCharLimit, termsOfServiceUrl };
};
