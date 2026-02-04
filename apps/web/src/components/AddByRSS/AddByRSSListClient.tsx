'use client';

import type { FormEvent } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { CallToActionMessage } from '../CallToActionMessage/CallToActionMessage';
import { TextInput } from '../Form/TextInput';
import LoadingSpinnerOverlay from '../LoadingSpinner/LoadingSpinnerOverlay';
import { MainInnerContentWrapper } from '../Main/MainInnerContentWrapper';
import { MainInnerWrapper } from '../Main/MainInnerWrapper';
import { MainWrapper } from '../Main/MainWrapper';
import { NoResults } from '../NoResults/NoResults';
import { AddByRSSListHeader } from './List/AddByRSSListHeader';
import { AddByRSSPodcastListNodes } from './Podcast/AddByRSSPodcastListNodes';
import { useAccount } from '../../contexts/Account';
import { useModals } from '../../contexts/Modals';
import { useLocalSettings } from '../../contexts/LocalSettings';
import styles from '../../styles/app/add-by-rss/AddByRSSList.module.scss';
import { enqueueAddByRSSParseAll, getFollowedAddByRSSChannels } from '../../utils/addByRSS/api';
import {
  applyAddByRSSParseStatus,
  followAddByRSSChannelAndQueue,
  pollAddByRSSParseStatus,
} from '../../utils/addByRSS/actions';
import { createAddByRSSId, createAddByRSSIdText } from '../../utils/addByRSS/ids';
import {
  bulkUpsertAddByRSSFeeds,
  bulkRemoveAddByRSSFeeds,
  getAddByRSSFeedsByResourceType,
  getAllAddByRSSFeeds,
} from '../../utils/addByRSS/storage';
import type {
  AddByRSSFeedRecord,
  AddByRSSParsedFeed,
  AddByRSSResourceType,
} from '../../utils/addByRSS/types';
import { AddByRSSAlbumNodes } from './Artist/Album/AddByRSSAlbumNodes';
import { AddByRSSArtistNodes } from './Artist/AddByRSSArtistNodes';
import { AddByRSSEpisodeNodes } from './Podcast/Episode/AddByRSSEpisodeNodes';
import { AddByRSSLivestreamNodes } from './Livestream/AddByRSSLivestreamNodes';
import { AddByRSSTrackNodes } from './Artist/Album/Track/AddByRSSTrackNodes';

type AddByRSSListClientProps = {
  resourceType: AddByRSSResourceType;
};

const getResourceLabel = (
  resourceType: AddByRSSResourceType,
  tMedia: ReturnType<typeof useTranslations>
) => {
  switch (resourceType) {
    case 'podcasts':
      return tMedia('podcast.podcasts');
    case 'episodes':
      return tMedia('podcast.episodes');
    case 'artists':
      return tMedia('music.artists');
    case 'albums':
      return tMedia('music.albums');
    case 'tracks':
      return tMedia('music.tracks');
    case 'livestreams':
      return tMedia('livestream.livestreams');
    default:
      return resourceType;
  }
};

const buildCacheMaps = (feeds: AddByRSSFeedRecord[]) => {
  const feedHashesByUrl: Record<string, string> = {};
  const etagsByUrl: Record<string, string> = {};
  const lastModifiedByUrl: Record<string, string> = {};

  for (const feed of feeds) {
    if (feed.cache?.feedHash) {
      feedHashesByUrl[feed.feedUrl] = feed.cache.feedHash;
    }
    if (feed.cache?.etag) {
      etagsByUrl[feed.feedUrl] = feed.cache.etag;
    }
    if (feed.cache?.lastModified) {
      lastModifiedByUrl[feed.feedUrl] = feed.cache.lastModified;
    }
  }

  return { feedHashesByUrl, etagsByUrl, lastModifiedByUrl };
};

const upsertFeedInState = (
  feeds: AddByRSSFeedRecord[],
  updated: AddByRSSFeedRecord
): AddByRSSFeedRecord[] => {
  const index = feeds.findIndex((feed) => feed.idText === updated.idText);
  if (index === -1) {
    return [...feeds, updated];
  }
  const next = [...feeds];
  next[index] = updated;
  return next;
};

export const AddByRSSListClient: React.FC<AddByRSSListClientProps> = ({ resourceType }) => {
  const tFeatures = useTranslations('features');
  const tMedia = useTranslations('media');
  const tInstructions = useTranslations('instructions');
  const tAuthentication = useTranslations('authentication');
  const { loggedInAccount, setLoggedInAccount } = useAccount();
  const { setModalAuthLogin } = useModals();
  const { viewSelected, setViewSelected } = useLocalSettings();

  const [feeds, setFeeds] = useState<AddByRSSFeedRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isAddingFeed, setIsAddingFeed] = useState(false);
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const headerTitle = useMemo(
    () => `${tFeatures('add_by_rss.label')} · ${getResourceLabel(resourceType, tMedia)}`,
    [resourceType, tFeatures, tMedia]
  );

  const refreshFeeds = useCallback(async () => {
    const nextFeeds = await getAddByRSSFeedsByResourceType(resourceType);
    setFeeds(nextFeeds.sort((a, b) => (a.title || a.feedUrl).localeCompare(b.title || b.feedUrl)));
  }, [resourceType]);

  const renderFeeds = () => {
    switch (resourceType) {
      case 'podcasts':
        return <AddByRSSPodcastListNodes feeds={feeds} viewSelected={viewSelected} />;
      case 'artists':
        return <AddByRSSArtistNodes feeds={feeds} viewSelected={viewSelected} />;
      case 'albums':
        return <AddByRSSAlbumNodes feeds={feeds} viewSelected={viewSelected} />;
      case 'episodes':
        return <AddByRSSEpisodeNodes feeds={feeds} viewSelected={viewSelected} />;
      case 'tracks':
        return <AddByRSSTrackNodes feeds={feeds} viewSelected={viewSelected} />;
      case 'livestreams':
        return <AddByRSSLivestreamNodes feeds={feeds} viewSelected={viewSelected} />;
      default:
        return null;
    }
  };

  const syncFeeds = useCallback(async () => {
    if (!loggedInAccount) {
      return;
    }

    const remote = await getFollowedAddByRSSChannels(loggedInAccount.id_text);
    const existing = await getAllAddByRSSFeeds();
    const remoteUrls = new Set(remote.map((channel) => channel.feed_url));
    const toRemove = existing
      .filter((feed) => !remoteUrls.has(feed.feedUrl))
      .map((feed) => feed.idText);
    const existingByUrl = new Map(existing.map((feed) => [feed.feedUrl, feed]));
    const now = new Date().toISOString();

    if (toRemove.length > 0) {
      await bulkRemoveAddByRSSFeeds(toRemove);
    }

    const toUpsert: AddByRSSFeedRecord[] = remote.map((channel) => {
      const existingRecord = existingByUrl.get(channel.feed_url);
      if (existingRecord) {
        return {
          ...existingRecord,
          title: channel.title ?? existingRecord.title,
          imageUrl: channel.image_url ?? existingRecord.imageUrl,
          updatedAt: now,
        };
      }

      const idText = createAddByRSSIdText();
      return {
        id: createAddByRSSId(idText),
        idText,
        resourceType: 'podcasts',
        feedUrl: channel.feed_url,
        title: channel.title ?? channel.feed_url,
        imageUrl: channel.image_url ?? null,
        updatedAt: now,
      };
    });

    if (toUpsert.length > 0) {
      await bulkUpsertAddByRSSFeeds(toUpsert);
    }
  }, [loggedInAccount]);

  const loadFeeds = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    if (!loggedInAccount) {
      setFeeds([]);
      setIsLoading(false);
      return;
    }

    try {
      await syncFeeds();
      await refreshFeeds();
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [loggedInAccount, refreshFeeds, syncFeeds]);

  const handleParseStatus = useCallback(
    async (
      feedUrl: string,
      parsedFeed: AddByRSSParsedFeed | undefined,
      status: AddByRSSFeedRecord['status'],
      cache?: AddByRSSFeedRecord['cache']
    ) => {
      await applyAddByRSSParseStatus({
        feedUrl,
        parsedFeed,
        status,
        cache,
        onUpdated: (record) => {
          if (record.resourceType === resourceType) {
            setFeeds((prev) => upsertFeedInState(prev, record));
          }
        },
      });
    },
    [resourceType]
  );

  const pollRequest = useCallback(
    async (requestId: string, feedUrl: string) => {
      await pollAddByRSSParseStatus({
        requestId,
        onStatusUpdate: async (statusResponse) => {
          await handleParseStatus(
            feedUrl,
            statusResponse.payload,
            statusResponse.status,
            statusResponse.cache
          );
        },
      });
    },
    [handleParseStatus]
  );

  const handleCheckForUpdates = useCallback(async () => {
    if (!loggedInAccount) {
      setModalAuthLogin({ isOpen: true });
      return;
    }

    setIsUpdating(true);
    setErrorMessage(null);

    try {
      const allFeeds = await getAllAddByRSSFeeds();
      const { feedHashesByUrl, etagsByUrl, lastModifiedByUrl } = buildCacheMaps(allFeeds);
      const response = await enqueueAddByRSSParseAll({
        feedHashesByUrl,
        etagsByUrl,
        lastModifiedByUrl,
      });

      for (const { feed_url: feedUrl } of response.request_ids) {
        await handleParseStatus(feedUrl, undefined, 'queued');
      }

      await Promise.all(
        response.request_ids.map(({ request_id, feed_url }) => pollRequest(request_id, feed_url))
      );
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setIsUpdating(false);
    }
  }, [handleParseStatus, loggedInAccount, pollRequest, setModalAuthLogin]);

  const handleAddFeed = useCallback(
    async (event?: FormEvent) => {
      event?.preventDefault();
      if (isAddingFeed) {
        return;
      }
      if (!loggedInAccount) {
        setModalAuthLogin({ isOpen: true });
        return;
      }

      const feedUrl = newFeedUrl.trim();
      if (!feedUrl) {
        return;
      }

      setIsAddingFeed(true);
      setErrorMessage(null);

      try {
        try {
          new URL(feedUrl);
        } catch {
          setErrorMessage(tFeatures('add_by_rss.invalid_url'));
          setIsAddingFeed(false);
          return;
        }

        const { requestId, account } = await followAddByRSSChannelAndQueue({
          feedUrl,
          resourceType,
          title: feedUrl,
          imageUrl: null,
        });
        if (account) {
          setLoggedInAccount(account);
        }
        setNewFeedUrl('');
        await pollRequest(requestId, feedUrl);
      } catch (error) {
        setErrorMessage((error as Error).message);
      } finally {
        setIsAddingFeed(false);
      }
    },
    [
      isAddingFeed,
      loggedInAccount,
      newFeedUrl,
      pollRequest,
      resourceType,
      setModalAuthLogin,
      setLoggedInAccount,
    ]
  );

  React.useEffect(() => {
    void loadFeeds();
  }, [loadFeeds]);

  return (
    <>
      <AddByRSSListHeader
        title={headerTitle}
        isUpdating={isUpdating}
        onCheckUpdates={handleCheckForUpdates}
        checkUpdatesLabel={tFeatures('add_by_rss.check_updates')}
        viewSelected={viewSelected}
        setViewSelected={setViewSelected}
      />
      <MainWrapper>
        <MainInnerWrapper>
          <MainInnerContentWrapper>
            {!loggedInAccount && (
              <CallToActionMessage
                message={tInstructions('login_for_subscriptions')}
                buttonLabel={tAuthentication('login')}
                onButtonClick={() => setModalAuthLogin({ isOpen: true })}
              />
            )}

            {loggedInAccount && (
              <form onSubmit={handleAddFeed} className={styles.addFeedForm}>
                <TextInput
                  value={newFeedUrl}
                  onChange={(event) => setNewFeedUrl(event.target.value)}
                  placeholder={tFeatures('add_by_rss.feed_url')}
                  aria-label={tFeatures('add_by_rss.feed_url')}
                  className={styles.addFeedInput}
                  infoError={errorMessage ?? undefined}
                  aria-invalid={errorMessage ? true : undefined}
                  button={{
                    label: tFeatures('add_feed.add_feed'),
                    onClick: () => {
                      void handleAddFeed();
                    },
                  }}
                />
              </form>
            )}

            {isLoading ? (
              <LoadingSpinnerOverlay isLoading />
            ) : feeds.length === 0 ? (
              <NoResults message={tFeatures('add_by_rss.no_feeds')} />
            ) : (
              renderFeeds()
            )}
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    </>
  );
};
