import { useCallback, useState } from 'react';

import type { AddByRSSParseCacheEntry } from '@podverse/helpers';

import { requestWithMobileAuthRefresh } from '../auth';
import { useAuth } from '../auth/AuthProvider';
import {
  buildAddByRssFeedRecord,
  isValidAddByRssFeedUrl,
  pollAddByRssParseStatus,
} from '../lib/addByRss/domain';
import { readAddByRSSFeeds, writeAddByRSSFeeds } from '../prefs/addByRSSFeeds';

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
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [addErrorKey, setAddErrorKey] = useState<string | null>(null);

  const addFeed = useCallback(async () => {
    if (status !== 'authenticated') {
      setAddErrorKey('authentication.login_required');
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

      const preview = await pollAddByRssParseStatus(parseRequest.request_id, async (requestId) =>
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

      const localFeeds = await readAddByRSSFeeds();
      const existingFeed = localFeeds.find((feed) => feed.feedUrl === feedUrl);
      const nextRecord = buildAddByRssFeedRecord(feedUrl, existingFeed, preview);
      const nextFeeds = [...localFeeds.filter((feed) => feed.feedUrl !== feedUrl), nextRecord];
      await writeAddByRSSFeeds(nextFeeds);
      setInputValue('');
      onNotice('features.add_by_rss.status_parsed');
      await onAfterAdd();
    } catch {
      setAddErrorKey('errors.generic');
    } finally {
      setIsAdding(false);
    }
  }, [
    accessToken,
    clearSession,
    inputValue,
    onAfterAdd,
    onNotice,
    refreshToken,
    setInputValue,
    setTokens,
    status,
  ]);

  return {
    addErrorKey,
    addFeed,
    isAdding,
  };
}
