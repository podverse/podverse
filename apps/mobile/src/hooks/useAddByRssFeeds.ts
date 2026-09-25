import { useCallback, useEffect, useMemo, useState } from 'react';

import { requestWithMobileAuthRefresh } from '../auth';
import { useAuth } from '../auth/AuthProvider';
import { addByRssCredentialStore, addByRssRepository } from '../data';
import type { AddByRssNeedsCredentialsFeed } from '../lib/addByRss/credentials';
import { partitionAddByRssFeedsByCredentials } from '../lib/addByRss/credentials';
import { mergeLocalAndRemoteAddByRssFeeds } from '../lib/addByRss/domain';
import { homeFeedRefresh } from '../lib/home/homeFeedRefresh';
import { createInFlightGuard } from '../lib/rateLimit/createInFlightGuard';
import type { MobileAddByRSSFeedRecord } from '../prefs/addByRSSFeeds';

type UseAddByRssFeedsOptions = {
  onNotice: (messageKey: string | null) => void;
};

type NeedsCredentialsItem = AddByRssNeedsCredentialsFeed<MobileAddByRSSFeedRecord>;

export function useAddByRssFeeds({ onNotice }: UseAddByRssFeedsOptions) {
  const { accessToken, account, clearSession, refreshToken, setTokens, status } = useAuth();
  const [feeds, setFeeds] = useState<MobileAddByRSSFeedRecord[]>([]);
  const [needsCredentials, setNeedsCredentials] = useState<NeedsCredentialsItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [removingFeedUrl, setRemovingFeedUrl] = useState<string | null>(null);
  const removeGuard = useMemo(() => createInFlightGuard(), []);

  /** Feeds waiting on a username and password move to their own section at the end of the list. */
  const showPartitioned = useCallback(async (records: MobileAddByRSSFeedRecord[]) => {
    const feedUrlsWithCredentials = await addByRssCredentialStore.listFeedUrlsForCurrentAccount();
    const split = partitionAddByRssFeedsByCredentials(records, feedUrlsWithCredentials);
    setFeeds(split.ready);
    setNeedsCredentials(split.needsCredentials);
  }, []);

  /** Re-read the device's feeds without the network, e.g. after the credentials screen saved. */
  const refreshLocal = useCallback(async () => {
    await showPartitioned(await addByRssRepository.listFeeds());
  }, [showPartitioned]);

  const reloadFeeds = useCallback(async () => {
    setIsLoading(true);
    setErrorKey(null);
    const localFeeds = await addByRssRepository.listFeeds();

    // Viewing add-by-RSS feeds is anonymous tier (`add_by_rss_view`): adding and refreshing need a
    // membership because they need server-side parsing, but feeds already on the device stay
    // readable and playable signed out. Only the remote reconciliation below needs an account.
    if (status !== 'authenticated' || account?.id_text === undefined) {
      await showPartitioned(localFeeds);
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
      await showPartitioned(mergedFeeds);
      // Persist merged records without a bundle so each parsed mapped feed is preserved.
      for (const feed of mergedFeeds) {
        await addByRssRepository.upsertFeed(feed);
      }
    } catch {
      // Offline / API error: fall back to the last-synced feeds from SQLite so the list still renders.
      if (localFeeds.length > 0) {
        await showPartitioned(localFeeds);
        setErrorKey(null);
      } else {
        setErrorKey('errors.generic');
        setFeeds([]);
        setNeedsCredentials([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    accessToken,
    account?.id_text,
    clearSession,
    refreshToken,
    setTokens,
    showPartitioned,
    status,
  ]);

  useEffect(() => {
    void reloadFeeds();
  }, [reloadFeeds]);

  const removeFeed = useCallback(
    async (feedUrl: string) => {
      const result = await removeGuard.run(feedUrl, async () => {
        setRemovingFeedUrl(feedUrl);
        try {
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
          await refreshLocal();
          // Home stays mounted under its tab, so it will not reload on its own.
          homeFeedRefresh.notify();
        } finally {
          setRemovingFeedUrl(null);
        }
      });
      return result !== false;
    },
    [accessToken, clearSession, onNotice, refreshLocal, refreshToken, removeGuard, setTokens]
  );

  return {
    errorKey,
    feeds,
    isLoading,
    needsCredentials,
    refreshLocal,
    reloadFeeds,
    removeFeed,
    removingFeedUrl,
  };
}
