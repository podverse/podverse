import { useEffect, useMemo, useState } from 'react';

import type { BoostEligibilityChannel } from '@podverse/v4v-metaboost';
import type {
  MetaBoost,
  PublicBoostMessagesCapabilityStatus,
  PublicBoostMessagesPageFetcher,
  PublicBoostMessagesScopeType,
} from '@podverse/v4v-metaboost';
import {
  createPublicBoostMessagesPageFetcher,
  fetchMbrssV1BoostCapability,
  getBoostEligibilityForContent,
} from '@podverse/v4v-metaboost';

export type MbrssPublicMessagesCapability = {
  publicMessagesUrl: string | null;
  status: PublicBoostMessagesCapabilityStatus;
};

const idleCapability = (): MbrssPublicMessagesCapability => ({
  publicMessagesUrl: null,
  status: 'idle',
});

/**
 * mbrss-v1 public-message capability for one MetaBoost node.
 * A null node, or a caller that is not ready to fetch, stays idle and does not request.
 */
export const useMbrssPublicMessagesCapability = (
  metaBoost: MetaBoost | null,
  fetchEnabled: boolean
): MbrssPublicMessagesCapability => {
  const [capability, setCapability] = useState<MbrssPublicMessagesCapability>(() =>
    metaBoost === null || !fetchEnabled
      ? idleCapability()
      : { publicMessagesUrl: null, status: 'loading' }
  );

  useEffect(() => {
    if (metaBoost === null || !fetchEnabled) {
      setCapability(idleCapability());
      return;
    }

    let cancelled = false;
    setCapability({ publicMessagesUrl: null, status: 'loading' });

    void fetchMbrssV1BoostCapability(metaBoost.node)
      .then((result) => {
        if (cancelled) {
          return;
        }
        setCapability({
          publicMessagesUrl: result.publicMessagesUrl,
          status: 'success',
        });
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setCapability({ publicMessagesUrl: null, status: 'error' });
      });

    return () => {
      cancelled = true;
    };
  }, [fetchEnabled, metaBoost]);

  return capability;
};

export type PublicBoostMessagesFetchState = {
  fetcher: PublicBoostMessagesPageFetcher | null;
  status: PublicBoostMessagesCapabilityStatus;
};

/**
 * The page fetcher for one channel or item, or null until mbrss-v1 exposes a public list.
 */
export const usePublicBoostMessagesFetchState = (input: {
  channel: BoostEligibilityChannel | null;
  fetchAllowed: boolean;
  itemGuid?: string | null;
  scopeType: PublicBoostMessagesScopeType;
}): PublicBoostMessagesFetchState => {
  const itemGuid = input.itemGuid ?? null;
  const eligibility = useMemo(
    () =>
      getBoostEligibilityForContent({
        channel: input.channel,
        itemGuid,
      }),
    [input.channel, itemGuid]
  );
  const metaBoost =
    eligibility.resolvedMetaBoost?.standard === 'mbrss-v1' ? eligibility.resolvedMetaBoost : null;
  const capability = useMbrssPublicMessagesCapability(metaBoost, input.fetchAllowed);
  const fetcher = useMemo(
    () =>
      createPublicBoostMessagesPageFetcher({
        capabilityStatus: capability.status,
        fetchAllowed: input.fetchAllowed,
        messagesScope: eligibility.mbrssMessagesScope,
        metaBoost: eligibility.resolvedMetaBoost,
        publicMessagesUrl: capability.publicMessagesUrl,
        scopeType: input.scopeType,
      }),
    [
      capability.publicMessagesUrl,
      capability.status,
      eligibility.mbrssMessagesScope,
      eligibility.resolvedMetaBoost,
      input.fetchAllowed,
      input.scopeType,
    ]
  );

  return { fetcher, status: capability.status };
};
