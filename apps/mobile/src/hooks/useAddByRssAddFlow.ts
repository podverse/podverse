import { useCallback, useRef, useState } from 'react';
import { Keyboard } from 'react-native';

import type { AddByRSSParseCacheEntry } from '@podverse/helpers';

import { requestWithMobileAuthRefresh } from '../auth';
import { useAuth } from '../auth/AuthProvider';
import { addByRssRepository } from '../data';
import { syncEventLogRepository } from '../data/repositories';
import {
  buildAddByRssAddErrorLog,
  buildAddByRssParseFailureLog,
} from '../lib/addByRss/addByRssErrorLog';
import {
  buildAddByRssFeedRecord,
  isValidAddByRssFeedUrl,
  pollAddByRssParseStatus,
} from '../lib/addByRss/domain';
import { homeFeedRefresh } from '../lib/home/homeFeedRefresh';
import { useMembershipGate } from '../membership/MembershipGateProvider';
import { useAccessTier } from '../membership/useAccessTier';
import { ADD_BY_RSS_ADD_LOG_KIND } from '../sync/syncJobKinds';

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
  const isAddingRef = useRef(false);

  // Adding requires server-side feed parsing, so it is membership-tier. Feeds already added stay
  // visible and playable when a membership lapses — only adding stops.
  const addAccess = evaluateFeature('add_by_rss_add');

  const addFeed = useCallback(async () => {
    if (isAddingRef.current) {
      return;
    }

    if (!addAccess.allowed) {
      openGate(addAccess.reason);
      return;
    }

    const feedUrl = inputValue.trim();
    if (!isValidAddByRssFeedUrl(feedUrl)) {
      setAddErrorKey('features.add_by_rss.invalid_url');
      return;
    }

    // The keyboard covers the tab bar. Dismiss now so the list and tabs are reachable while parse runs.
    Keyboard.dismiss();
    isAddingRef.current = true;
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

      const parseResult = await pollAddByRssParseStatus(
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
      const { mappedFeed, preview } = parseResult;

      // The follow already exists server-side, so the feed row is kept either way. A background
      // refresh picks up a feed whose host recovers.
      const existingFeed = await addByRssRepository.getFeedByUrl(feedUrl);
      const nextRecord = buildAddByRssFeedRecord(feedUrl, existingFeed ?? undefined, preview);
      await addByRssRepository.upsertFeed(nextRecord, mappedFeed);
      setInputValue('');

      const failureLog = buildAddByRssParseFailureLog({
        feedUrl,
        jobKind: ADD_BY_RSS_ADD_LOG_KIND,
        occurredAt: Date.now(),
        requestId: parseRequest.request_id,
        result: parseResult,
      });
      if (failureLog === null) {
        onNotice('features.add_by_rss.status_parsed');
      } else {
        void syncEventLogRepository.append(failureLog);
        onNotice(
          parseResult.status === 'failed' || parseResult.status === 'parsed'
            ? 'error_log.add_by_rss.parse_failed_notice'
            : 'error_log.add_by_rss.parse_pending_notice'
        );
      }
      await onAfterAdd();
      // Home stays mounted under the tab, so it will not reload on its own.
      homeFeedRefresh.notify();
    } catch (error) {
      if (handleGateError(error)) {
        return;
      }
      void syncEventLogRepository.append(buildAddByRssAddErrorLog(error, feedUrl, Date.now()));
      setAddErrorKey('error_log.add_by_rss.add_failed');
    } finally {
      isAddingRef.current = false;
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
