import { useCallback, useEffect, useState } from 'react';

import { requestWithMobileAuthRefresh } from '../auth';
import { useAuth } from '../auth/AuthProvider';
import { addByRssRepository } from '../data';
import { mergeLocalAndRemoteAddByRssFeeds } from '../lib/addByRss/domain';
import type { MobileAddByRSSFeedRecord } from '../prefs/addByRSSFeeds';

type UseAddByRssFeedsOptions = {
  onNotice: (messageKey: string | null) => void;
};

export function useAddByRssFeeds({ onNotice }: UseAddByRssFeedsOptions) {
  const { accessToken, account, clearSession, refreshToken, setTokens, status } = useAuth();
  const [feeds, setFeeds] = useState<MobileAddByRSSFeedRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const reloadFeeds = useCallback(async () => {
    setIsLoading(true);
    setErrorKey(null);
    const localFeeds = await addByRssRepository.listFeeds();

    // Viewing add-by-RSS feeds is anonymous tier (`add_by_rss_view`): adding and refreshing need a
    // membership because they need server-side parsing, but feeds already on the device stay
    // readable and playable signed out (701). Only the remote reconciliation below needs an account.
    if (status !== 'authenticated' || account?.id_text === undefined) {
      setFeeds(localFeeds);
      setErrorKey(null);
      setIsLoading(false);
      return;
    }

    try {
      const remoteFeeds = await requestWithMobileAuthRefresh(
        {
          accessToken,
          clearSession,
          refreshToken,
          setTokens,
        },
        async (api) =>
          api.reqAccountGetFollowedAddByRSSChannels({
            account_id_text: account.id_text,
          })
      );

      const mergedFeeds = mergeLocalAndRemoteAddByRssFeeds(localFeeds, remoteFeeds);
      setFeeds(mergedFeeds);
      // Persist merged records without a bundle so any previously parsed mapped feed is preserved.
      for (const feed of mergedFeeds) {
        await addByRssRepository.upsertFeed(feed);
      }
    } catch {
      // Offline / API error: fall back to the last-synced feeds from SQLite so the list still renders.
      if (localFeeds.length > 0) {
        setFeeds(localFeeds);
        setErrorKey(null);
      } else {
        setErrorKey('errors.generic');
        setFeeds([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, account?.id_text, clearSession, refreshToken, setTokens, status]);

  useEffect(() => {
    void reloadFeeds();
  }, [reloadFeeds]);

  const removeFeed = useCallback(
    async (feedUrl: string) => {
      try {
        await requestWithMobileAuthRefresh(
          {
            accessToken,
            clearSession,
            refreshToken,
            setTokens,
          },
          async (api) =>
            api.reqAccountUnfollowAddByRSSChannel({
              feed_url: feedUrl,
            })
        );
      } catch {
        onNotice('errors.generic');
      }

      await addByRssRepository.removeFeed(feedUrl);
      const nextFeeds = await addByRssRepository.listFeeds();
      setFeeds(nextFeeds);
    },
    [accessToken, clearSession, onNotice, refreshToken, setTokens]
  );

  return {
    errorKey,
    feeds,
    isLoading,
    reloadFeeds,
    removeFeed,
  };
}
