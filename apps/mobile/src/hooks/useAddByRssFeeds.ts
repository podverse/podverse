import { useCallback, useEffect, useState } from 'react';

import { requestWithMobileAuthRefresh } from '../auth';
import { useAuth } from '../auth/AuthProvider';
import { mergeLocalAndRemoteAddByRssFeeds } from '../lib/addByRss/domain';
import type { MobileAddByRSSFeedRecord } from '../prefs/addByRSSFeeds';
import { readAddByRSSFeeds, writeAddByRSSFeeds } from '../prefs/addByRSSFeeds';

type UseAddByRssFeedsOptions = {
  onNotice: (messageKey: string | null) => void;
};

export function useAddByRssFeeds({ onNotice }: UseAddByRssFeedsOptions) {
  const { accessToken, account, clearSession, refreshToken, setTokens, status } = useAuth();
  const [feeds, setFeeds] = useState<MobileAddByRSSFeedRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const reloadFeeds = useCallback(async () => {
    if (status !== 'authenticated' || account?.id_text === undefined) {
      setFeeds([]);
      setErrorKey(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorKey(null);
    try {
      const localFeeds = await readAddByRSSFeeds();
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
      await writeAddByRSSFeeds(mergedFeeds);
    } catch {
      setErrorKey('errors.generic');
      setFeeds([]);
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

      const localFeeds = await readAddByRSSFeeds();
      const nextFeeds = localFeeds.filter((feed) => feed.feedUrl !== feedUrl);
      await writeAddByRSSFeeds(nextFeeds);
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
