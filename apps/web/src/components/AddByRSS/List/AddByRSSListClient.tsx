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
import { dismissToast, showToast, showToastLoading } from '../../Toast/Toast';
import { AddByRSSPodcastListNodes } from '../Podcast/AddByRSSPodcastListNodes';
import { useAccount } from '../../../contexts/Account';
import { useModals } from '../../../contexts/Modals';
import { useLocalSettings } from '../../../contexts/LocalSettings';
import { getFollowedAddByRSSChannels } from '../../../utils/addByRSS/api';
import { applyAddByRSSParseStatus } from '../../../utils/addByRSS/actions';
import { createAddByRSSId, createAddByRSSIdText } from '@podverse/helpers';
import {
  bulkUpsertAddByRSSFeeds,
  bulkRemoveAddByRSSFeeds,
  clearAddByRSSItemsIndex,
  getAddByRSSFeedsByResourceType,
  getAllAddByRSSFeeds,
} from '../../../utils/addByRSS/storage';
import type {
  AddByRSSFeedRecord,
  AddByRSSItemIndexItem,
  AddByRSSParsedFeed,
  AddByRSSResourceType,
} from '../../../utils/addByRSS/types';
import { AddByRSSAlbumNodes } from '../Artist/Album/AddByRSSAlbumNodes';
import { AddByRSSArtistNodes } from '../Artist/AddByRSSArtistNodes';
import { AddByRSSEpisodeNodes } from '../Podcast/Episode/AddByRSSEpisodeNodes';
import { AddByRSSLivestreamFeedNodes } from '../Livestream/AddByRSSLivestreamFeedNodes';
import { AddByRSSTrackNodes } from '../Artist/Album/Track/AddByRSSTrackNodes';
import {
  buildAddByRSSItemsIndex,
  buildItemIdTextMap,
  getAddByRSSItemsIndexPageOrEmpty,
  ADD_BY_RSS_ITEMS_PAGE_SIZE,
} from '../../../utils/addByRSS/itemIndex';
import { runAddByRSSParseAll } from '../../../utils/addByRSS/parseAll';

type AddByRSSListClientProps = {
  resourceType: AddByRSSResourceType;
};

type ListSort = 'recent' | 'oldest';

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
  const tMisc = useTranslations('misc');
  const { loggedInAccount } = useAccount();
  const { setModalAuthLogin } = useModals();
  const { viewSelected, setViewSelected } = useLocalSettings();
  const searchParams = useSearchParams();

  const [feeds, setFeeds] = useState<AddByRSSFeedRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [itemIdTextMap, setItemIdTextMap] = useState<Map<string, string>>(new Map());
  const [trackItems, setTrackItems] = useState<AddByRSSItemIndexItem[]>([]);

  const initialListSort = useMemo<ListSort>(() => {
    return searchParams.get('sort') === 'oldest' ? 'oldest' : 'recent';
  }, [searchParams]);

  const [listSort, setListSort] = useState<ListSort>(initialListSort);

  useEffect(() => {
    if (searchParams.has('sort')) {
      setListSort(initialListSort);
    }
  }, [initialListSort, searchParams]);

  const handleListSortChange = (value: string) => {
    const nextSort: ListSort = value === 'oldest' ? 'oldest' : 'recent';
    setListSort(nextSort);
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
    resourceType === 'podcasts' || resourceType === 'albums' || resourceType === 'tracks' ? (
      <Dropdown value={listSort} menuItems={sortMenuItems} onChange={handleListSortChange} />
    ) : null;

  const sortFeedsByDate = (
    nextFeeds: AddByRSSFeedRecord[],
    sortOrder: ListSort
  ): AddByRSSFeedRecord[] => {
    return [...nextFeeds].sort((a, b) => {
      const aDateRaw = a.mappedFeed?.channel?.about?.last_pub_date ?? null;
      const bDateRaw = b.mappedFeed?.channel?.about?.last_pub_date ?? null;
      const aDate =
        aDateRaw instanceof Date ? aDateRaw.getTime() : aDateRaw ? new Date(aDateRaw).getTime() : 0;
      const bDate =
        bDateRaw instanceof Date ? bDateRaw.getTime() : bDateRaw ? new Date(bDateRaw).getTime() : 0;
      if (aDate === bDate) {
        return (a.title || a.feedUrl).localeCompare(b.title || b.feedUrl);
      }
      return sortOrder === 'oldest' ? aDate - bDate : bDate - aDate;
    });
  };

  const refreshFeeds = useCallback(async () => {
    const nextFeeds = await getAddByRSSFeedsByResourceType(resourceType);
    if (resourceType === 'podcasts' || resourceType === 'albums') {
      setFeeds(sortFeedsByDate(nextFeeds, listSort));
      return;
    }
    setFeeds(nextFeeds.sort((a, b) => (a.title || a.feedUrl).localeCompare(b.title || b.feedUrl)));
  }, [listSort, resourceType]);

  useEffect(() => {
    if (resourceType !== 'podcasts' && resourceType !== 'albums') {
      return;
    }
    setFeeds((prev) => sortFeedsByDate(prev, listSort));
  }, [listSort, resourceType]);

  useEffect(() => {
    if (resourceType === 'episodes') {
      const init = async () => {
        await buildAddByRSSItemsIndex(feeds);
        const map = await buildItemIdTextMap();
        setItemIdTextMap(map);
      };
      void init();
    }
  }, [resourceType, feeds]);

  // Wait for initial sync to finish so the items index is built from up-to-date feeds (same idea as episodes depending on feeds).
  useEffect(() => {
    if (resourceType !== 'tracks' || isLoading) {
      return;
    }
    const loadTrackItems = async () => {
      // Build items index from all feeds (albums have music medium)
      const allFeeds = await getAllAddByRSSFeeds();
      await buildAddByRSSItemsIndex(allFeeds);

      // Query items with music medium filter and current sort
      const result = await getAddByRSSItemsIndexPageOrEmpty({
        sort: listSort,
        page: 1,
        pageSize: ADD_BY_RSS_ITEMS_PAGE_SIZE,
        mediumFilter: 'music',
      });
      setTrackItems(result.items);
    };
    void loadTrackItems();
  }, [resourceType, listSort, isLoading]);

  const renderFeeds = () => {
    switch (resourceType) {
      case 'podcasts':
        return <AddByRSSPodcastListNodes feeds={feeds} viewSelected={viewSelected} />;
      case 'artists':
        return <AddByRSSArtistNodes feeds={feeds} viewSelected={viewSelected} />;
      case 'albums':
        return <AddByRSSAlbumNodes feeds={feeds} viewSelected={viewSelected} />;
      case 'episodes':
        return (
          <AddByRSSEpisodeNodes
            feeds={feeds}
            viewSelected={viewSelected}
            itemIdTextMap={itemIdTextMap}
          />
        );
      case 'tracks':
        return (
          <AddByRSSTrackNodes items={trackItems} viewSelected={viewSelected} sortOrder={listSort} />
        );
      case 'livestreams':
        return <AddByRSSLivestreamFeedNodes feeds={feeds} viewSelected={viewSelected} />;
      default:
        return null;
    }
  };

  const startDelayedLoadingToast = () => {
    let toastId: string | Promise<string> | null = null;
    const timer = setTimeout(() => {
      toastId = showToastLoading(tMisc('loading'));
    }, 250);

    return () => {
      clearTimeout(timer);
      if (toastId) {
        void Promise.resolve(toastId).then((resolvedToastId) => {
          dismissToast(resolvedToastId);
        });
      }
    };
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
      await clearAddByRSSItemsIndex();
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

  const handleCheckForUpdates = useCallback(async () => {
    if (!loggedInAccount) {
      setModalAuthLogin({ isOpen: true });
      return;
    }

    setIsUpdating(true);
    const stopLoadingToast = startDelayedLoadingToast();

    const runUpdates = async () => {
      const allFeeds = await getAllAddByRSSFeeds();
      const result = await runAddByRSSParseAll({
        feeds: allFeeds,
        onQueued: async (feedUrl) => handleParseStatus(feedUrl, undefined, 'queued'),
        onStatusUpdate: async (feedUrl, statusResponse) =>
          handleParseStatus(
            feedUrl,
            statusResponse.payload,
            statusResponse.status,
            statusResponse.cache
          ),
      });

      return result;
    };

    try {
      const result = await runUpdates();
      if (result.dedupedFeedUrls.length > 0 && result.dedupeTtlSeconds) {
        const minutes = Math.max(1, Math.ceil(result.dedupeTtlSeconds / 60));
        const waitKey =
          minutes === 1 ? 'add_by_rss.wait_to_retry_minute' : 'add_by_rss.wait_to_retry_minutes';
        showToast(tFeatures(waitKey, { minutes }), 'warning');
      } else {
        showToast(tMisc('done'), 'success');
      }
    } catch (error) {
      showToast(tFeatures('add_by_rss.status_failed'), 'error');
      console.error(error);
    } finally {
      stopLoadingToast();
      setIsUpdating(false);
    }
  }, [handleParseStatus, loggedInAccount, setModalAuthLogin, tFeatures, tMisc]);

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
              <NoResults
                message={tFeatures(
                  resourceType === 'artists' ||
                    resourceType === 'albums' ||
                    resourceType === 'tracks'
                    ? 'add_by_rss.no_feeds_music'
                    : 'add_by_rss.no_feeds_podcast'
                )}
              />
            ) : (
              renderFeeds()
            )}
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    </>
  );
};
