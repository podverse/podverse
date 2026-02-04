'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';

import { CallToActionMessage } from '../../CallToActionMessage/CallToActionMessage';
import LoadingSpinnerOverlay from '../../LoadingSpinner/LoadingSpinnerOverlay';
import { MainInnerContentWrapper } from '../../Main/MainInnerContentWrapper';
import { MainInnerWrapper } from '../../Main/MainInnerWrapper';
import { MainWrapper } from '../../Main/MainWrapper';
import { NoResults } from '../../NoResults/NoResults';
import Dropdown from '../../Dropdown/Dropdown';
import { AddByRSSListHeader } from './AddByRSSListHeader';
import { AddByRSSPodcastListNodes } from '../Podcast/AddByRSSPodcastListNodes';
import { useAccount } from '../../../contexts/Account';
import { useModals } from '../../../contexts/Modals';
import { useLocalSettings } from '../../../contexts/LocalSettings';
import { enqueueAddByRSSParseAll, getFollowedAddByRSSChannels } from '../../../utils/addByRSS/api';
import { applyAddByRSSParseStatus, pollAddByRSSParseStatus } from '../../../utils/addByRSS/actions';
import { createAddByRSSId, createAddByRSSIdText } from '../../../utils/addByRSS/ids';
import {
  bulkUpsertAddByRSSFeeds,
  bulkRemoveAddByRSSFeeds,
  getAddByRSSFeedsByResourceType,
  getAllAddByRSSFeeds,
} from '../../../utils/addByRSS/storage';
import type {
  AddByRSSFeedRecord,
  AddByRSSParsedFeed,
  AddByRSSResourceType,
} from '../../../utils/addByRSS/types';
import { AddByRSSAlbumNodes } from '../Artist/Album/AddByRSSAlbumNodes';
import { AddByRSSArtistNodes } from '../Artist/AddByRSSArtistNodes';
import { AddByRSSEpisodeNodes } from '../Podcast/Episode/AddByRSSEpisodeNodes';
import { AddByRSSLivestreamNodes } from '../Livestream/AddByRSSLivestreamNodes';
import { AddByRSSTrackNodes } from '../Artist/Album/Track/AddByRSSTrackNodes';

type AddByRSSListClientProps = {
  resourceType: AddByRSSResourceType;
};

type AddByRSSPodcastSort = 'recent' | 'oldest';

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
  const tFilters = useTranslations('filters');
  const tInstructions = useTranslations('instructions');
  const tAuthentication = useTranslations('authentication');
  const { loggedInAccount } = useAccount();
  const { setModalAuthLogin } = useModals();
  const { viewSelected, setViewSelected } = useLocalSettings();
  const searchParams = useSearchParams();

  const [feeds, setFeeds] = useState<AddByRSSFeedRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const initialPodcastSort = useMemo<AddByRSSPodcastSort>(() => {
    return searchParams.get('sort') === 'oldest' ? 'oldest' : 'recent';
  }, [searchParams]);

  const [podcastSort, setPodcastSort] = useState<AddByRSSPodcastSort>(initialPodcastSort);

  useEffect(() => {
    if (searchParams.has('sort')) {
      setPodcastSort(initialPodcastSort);
    }
  }, [initialPodcastSort, searchParams]);

  const handlePodcastSortChange = (value: string) => {
    const nextSort: AddByRSSPodcastSort = value === 'oldest' ? 'oldest' : 'recent';
    setPodcastSort(nextSort);
  };

  const headerTitle = useMemo(
    () => `${tFeatures('add_by_rss.label')} · ${getResourceLabel(resourceType, tMedia)}`,
    [resourceType, tFeatures, tMedia]
  );

  const sortMenuItems = useMemo(
    () => [
      { label: tFilters('sort.recent'), param: 'sort', value: 'recent' },
      { label: tFilters('sort.oldest'), param: 'sort', value: 'oldest' },
    ],
    [tFilters]
  );

  const extraButtons =
    resourceType === 'podcasts' ? (
      <Dropdown value={podcastSort} menuItems={sortMenuItems} onChange={handlePodcastSortChange} />
    ) : null;

  const refreshFeeds = useCallback(async () => {
    const nextFeeds = await getAddByRSSFeedsByResourceType(resourceType);
    if (resourceType === 'podcasts') {
      const sorted = [...nextFeeds].sort((a, b) => {
        const aDateRaw = a.mappedFeed?.channel?.about?.last_pub_date ?? null;
        const bDateRaw = b.mappedFeed?.channel?.about?.last_pub_date ?? null;
        const aDate =
          aDateRaw instanceof Date
            ? aDateRaw.getTime()
            : aDateRaw
              ? new Date(aDateRaw).getTime()
              : 0;
        const bDate =
          bDateRaw instanceof Date
            ? bDateRaw.getTime()
            : bDateRaw
              ? new Date(bDateRaw).getTime()
              : 0;
        if (aDate === bDate) {
          return (a.title || a.feedUrl).localeCompare(b.title || b.feedUrl);
        }
        return podcastSort === 'oldest' ? aDate - bDate : bDate - aDate;
      });
      setFeeds(sorted);
      return;
    }
    setFeeds(nextFeeds.sort((a, b) => (a.title || a.feedUrl).localeCompare(b.title || b.feedUrl)));
  }, [podcastSort, resourceType]);

  useEffect(() => {
    if (resourceType !== 'podcasts') {
      return;
    }
    setFeeds((prev) => {
      const sorted = [...prev].sort((a, b) => {
        const aDateRaw = a.mappedFeed?.channel?.about?.last_pub_date ?? null;
        const bDateRaw = b.mappedFeed?.channel?.about?.last_pub_date ?? null;
        const aDate =
          aDateRaw instanceof Date
            ? aDateRaw.getTime()
            : aDateRaw
              ? new Date(aDateRaw).getTime()
              : 0;
        const bDate =
          bDateRaw instanceof Date
            ? bDateRaw.getTime()
            : bDateRaw
              ? new Date(bDateRaw).getTime()
              : 0;
        if (aDate === bDate) {
          return (a.title || a.feedUrl).localeCompare(b.title || b.feedUrl);
        }
        return podcastSort === 'oldest' ? aDate - bDate : bDate - aDate;
      });
      return sorted;
    });
  }, [podcastSort, resourceType]);

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
    if (!loggedInAccount) {
      setFeeds([]);
      setIsLoading(false);
      return;
    }

    try {
      await syncFeeds();
      await refreshFeeds();
    } catch (error) {
      console.error(error);
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
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  }, [handleParseStatus, loggedInAccount, pollRequest, setModalAuthLogin]);

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
        extraButtons={extraButtons}
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

            {isLoading && !isUpdating ? (
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
