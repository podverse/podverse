import { useCallback, useState } from 'react';

import type { AddByRSSParseCacheEntry } from '@podverse/helpers';

import { requestWithMobileAuthRefresh } from '../auth';
import { useAuth } from '../auth/AuthProvider';
import { addByRssRepository } from '../data';
import {
  buildAddByRssFeedRecord,
  isValidAddByRssFeedUrl,
  pollAddByRssParseStatus,
} from '../lib/addByRss/domain';
import { useMembershipGate } from '../membership/MembershipGateProvider';
import { useAccessTier } from '../membership/useAccessTier';

type UseAddByRssAddFlowOptions = {
  inputValue: string;
  onAfterAdd: () => Promise<void>;
  onNotice: (messageKey: string | null) => void;
  setInputValue: (value: string) => void;
};

export function useAddByRssAddFlow({
  inputValue,
  onAfterAdd,
  onNotice,
  setInputValue,
}: UseAddByRssAddFlowOptions) {
  const { accessToken, clearSession, refreshToken, setTokens } = useAuth();
  const { handleGateError, openGate } = useMembershipGate();
  const { evaluateFeature } = useAccessTier();
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [addErrorKey, setAddErrorKey] = useState<string | null>(null);

  // Adding requires server-side feed parsing, so it is membership-tier. Feeds already added stay
  // visible and playable when a membership lapses — only adding stops.
  const addAccess = evaluateFeature('add_by_rss_add');

  const addFeed = useCallback(async () => {
    if (!addAccess.allowed) {
      openGate(addAccess.reason);
      return;
    }

    const feedUrl = inputValue.trim();
    if (!isValidAddByRssFeedUrl(feedUrl)) {
      setAddErrorKey('features.add_by_rss.invalid_url');
      return;
    }

    setIsAdding(true);
    setAddErrorKey(null);
    onNotice(null);
    try {
      await requestWithMobileAuthRefresh(
        {
          accessToken,
          clearSession,
          refreshToken,
          setTokens,
        },
        async (api) =>
          api.reqAccountFollowAddByRSSChannel({
            feed_url: feedUrl,
            image_url: null,
            title: feedUrl,
          })
      );

      const parseRequest = await requestWithMobileAuthRefresh(
        {
          accessToken,
          clearSession,
          refreshToken,
          setTokens,
        },
        async (api) =>
          api.apiRequest<{ request_id: string }>({
            path: '/account/add-by-rss/parse',
            method: 'POST',
            config: {
              withCredentials: true,
            },
            data: {
              feed_url: feedUrl,
            },
          })
      );

      const { mappedFeed, preview } = await pollAddByRssParseStatus(
        parseRequest.request_id,
        async (requestId) =>
          requestWithMobileAuthRefresh(
            {
              accessToken,
              clearSession,
              refreshToken,
              setTokens,
            },
            async (api) =>
              api.apiRequest<AddByRSSParseCacheEntry<unknown>>({
                path: `/account/add-by-rss/parse/status/${requestId}`,
                method: 'GET',
                config: {
                  withCredentials: true,
                },
              })
          )
      );

      const existingFeed = await addByRssRepository.getFeedByUrl(feedUrl);
      const nextRecord = buildAddByRssFeedRecord(feedUrl, existingFeed ?? undefined, preview);
      await addByRssRepository.upsertFeed(nextRecord, mappedFeed);
      setInputValue('');
      onNotice('features.add_by_rss.status_parsed');
      await onAfterAdd();
    } catch (error) {
      if (handleGateError(error)) {
        return;
      }
      setAddErrorKey('errors.generic');
    } finally {
      setIsAdding(false);
    }
  }, [
    accessToken,
    addAccess,
    clearSession,
    handleGateError,
    inputValue,
    onAfterAdd,
    onNotice,
    openGate,
    refreshToken,
    setInputValue,
    setTokens,
  ]);

  return {
    addAccess,
    addErrorKey,
    addFeed,
    isAdding,
  };
}
