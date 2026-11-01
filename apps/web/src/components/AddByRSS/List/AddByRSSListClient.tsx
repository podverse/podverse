'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { AddByRSSParseStatus } from '@podverse/helpers';
import { CallToActionMessage, MainColumnStack, MainSidebarLayout } from '@podverse/ui';

import { useAccount } from '../../../contexts/Account';
import type { AddByRSSListSortOrder } from '../../../contexts/AddByRSSListContext';
import { useLocalSettings } from '../../../contexts/LocalSettings';
import { useModals } from '../../../contexts/Modals';
import type { AddByRSSParseOutcome } from '../../../utils/addByRSS/actions';
import { applyAddByRSSParseStatus } from '../../../utils/addByRSS/actions';
import { partitionAddByRSSFeedsByCredentials } from '../../../utils/addByRSS/credentialsStatus';
import { listFeedsWithCredentials } from '../../../utils/addByRSS/credentialStore';
import { onAddByRSSFeedChanged } from '../../../utils/addByRSS/feedChangedEvent';
import { enqueueAddByRSSFirstParses } from '../../../utils/addByRSS/firstParse';
import {
  ADD_BY_RSS_ITEMS_PAGE_SIZE,
  buildAddByRSSItemsIndex,
  buildItemIdTextMap,
  getAddByRSSItemsIndexPageOrEmpty,
} from '../../../utils/addByRSS/itemIndex';
import { runAddByRSSParseAll } from '../../../utils/addByRSS/parseAll';
import {
  getAddByRSSFeedsByResourceType,
  getAllAddByRSSFeeds,
} from '../../../utils/addByRSS/storage';
import { syncAddByRSSFollowStubs } from '../../../utils/addByRSS/sync';
import type {
  AddByRSSFeedRecord,
  AddByRSSItemIndexItem,
  AddByRSSParsedFeed,
  AddByRSSResourceType,
} from '../../../utils/addByRSS/types';
import { WebLoadingSpinnerOverlay } from '../../LoadingSpinner/WebLoadingSpinnerOverlay';
import { MainWrapper } from '../../Main/MainWrapper';
import type { MediaListChipsConfig } from '../../MediaListChips/MediaListChips';
import { NoResults } from '../../NoResults/NoResults';
import { dismissToast, showToast, showToastLoading } from '../../Toast/Toast';
import { AddByRSSArtistNodes } from '../Artist/AddByRSSArtistNodes';
import { AddByRSSAlbumNodes } from '../Artist/Album/AddByRSSAlbumNodes';
import { AddByRSSTrackNodes } from '../Artist/Album/Track/AddByRSSTrackNodes';
import { AddByRSSPodcastListNodes } from '../Podcast/AddByRSSPodcastListNodes';
import { AddByRSSEpisodeNodes } from '../Podcast/Episode/AddByRSSEpisodeNodes';
import { AddByRSSListHeader, AddByRSSListToolbar } from './AddByRSSListHeader';
import { AddByRSSNeedsCredentialsSection } from './AddByRSSNeedsCredentialsSection';

type AddByRSSListClientProps = {
  chipsConfig: MediaListChipsConfig;
  resourceType: AddByRSSResourceType;
};

const FEED_CHANGED_REFRESH_DELAY_MS = 250;

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

export const AddByRSSListClient: React.FC<AddByRSSListClientProps> = ({
  chipsConfig,
  resourceType,
}) => {
  const tFeatures = useTranslations('features');
  const tMedia = useTranslations('media');
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
  const [feedUrlsWithCredentials, setFeedUrlsWithCredentials] = useState<ReadonlySet<string>>(
    () => new Set()
  );

  const { ready: readyFeeds, needsCredentials } = useMemo(
    () => partitionAddByRSSFeedsByCredentials(feeds, feedUrlsWithCredentials),
    [feeds, feedUrlsWithCredentials]
  );
  const showsNeedsCredentialsSection = resourceType !== 'tracks' && resourceType !== 'episodes';

  const initialListSort = useMemo<AddByRSSListSortOrder>(() => {
    return searchParams.get('sort') === 'oldest' ? 'oldest' : 'recent';
  }, [searchParams]);

  const [listSort, setListSort] = useState<AddByRSSListSortOrder>(initialListSort);

  useEffect(() => {
    if (searchParams.has('sort')) {
      setListSort(initialListSort);
    }
  }, [initialListSort, searchParams]);

  const handleListSortChange = (value: AddByRSSListSortOrder) => {
    setListSort(value);
  };

  const showsListSort =
    resourceType === 'podcasts' || resourceType === 'albums' || resourceType === 'tracks';

  const sortFeedsByDate = (
    nextFeeds: AddByRSSFeedRecord[],
    sortOrder: AddByRSSListSortOrder
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
        return <AddByRSSPodcastListNodes feeds={readyFeeds} viewSelected={viewSelected} />;
      case 'artists':
        return <AddByRSSArtistNodes feeds={readyFeeds} viewSelected={viewSelected} />;
      case 'albums':
        return <AddByRSSAlbumNodes feeds={readyFeeds} viewSelected={viewSelected} />;
      case 'episodes':
        return (
          <AddByRSSEpisodeNodes
            feeds={readyFeeds}
            viewSelected={viewSelected}
            itemIdTextMap={itemIdTextMap}
          />
        );
      case 'tracks':
        return (
          <AddByRSSTrackNodes items={trackItems} viewSelected={viewSelected} sortOrder={listSort} />
        );
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
    await syncAddByRSSFollowStubs(loggedInAccount.id_text);
  }, [loggedInAccount]);

  const loadFeeds = useCallback(async () => {
    setIsLoading(true);
    if (!loggedInAccount) {
      setFeeds([]);
      setIsLoading(false);
      return;
    }

    try {
      setFeedUrlsWithCredentials(new Set(await listFeedsWithCredentials(loggedInAccount.id_text)));
    } catch (error) {
      console.error(error);
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
      status: AddByRSSParseStatus,
      cache?: AddByRSSFeedRecord['cache'],
      outcome?: AddByRSSParseOutcome
    ) => {
      await applyAddByRSSParseStatus({
        feedUrl,
        parsedFeed,
        status,
        cache,
        outcome,
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
        accountId: loggedInAccount.id_text,
        feeds: allFeeds,
        onQueued: async (feedUrl) => handleParseStatus(feedUrl, undefined, 'queued'),
        onStatusUpdate: async (feedUrl, statusResponse) =>
          handleParseStatus(
            feedUrl,
            statusResponse.payload,
            statusResponse.status,
            statusResponse.cache,
            statusResponse
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

  // A parse started elsewhere (the background refresh, another page) lands here too. Bursts of
  // status updates collapse into one re-read.
  React.useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = onAddByRSSFeedChanged(() => {
      if (timer !== null) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => {
        timer = null;
        void refreshFeeds();
      }, FEED_CHANGED_REFRESH_DELAY_MS);
    });
    return () => {
      unsubscribe();
      if (timer !== null) {
        clearTimeout(timer);
      }
    };
  }, [refreshFeeds]);

  React.useEffect(() => {
    if (!loggedInAccount) {
      return;
    }
    void enqueueAddByRSSFirstParses({
      accountId: loggedInAccount.id_text,
      onStatus: handleParseStatus,
    });
  }, [feeds, handleParseStatus, loggedInAccount]);

  return (
    <>
      <AddByRSSListHeader title={tFeatures('add_by_rss.label')} />
      <MainWrapper>
        <MainSidebarLayout>
          <MainColumnStack>
            <AddByRSSListToolbar
              chipsConfig={chipsConfig}
              isUpdating={isUpdating}
              onCheckUpdates={handleCheckForUpdates}
              sort={showsListSort ? { value: listSort, onChange: handleListSortChange } : undefined}
              view={{ viewSelected, setViewSelected }}
            />
            {!loggedInAccount && (
              <CallToActionMessage
                message={tInstructions('login_for_subscriptions')}
                buttonLabel={tAuthentication('login')}
                onButtonClick={() => setModalAuthLogin({ isOpen: true })}
              />
            )}

            {!(isLoading && !isUpdating) &&
            loggedInAccount &&
            readyFeeds.length === 0 &&
            (!showsNeedsCredentialsSection || needsCredentials.length === 0) ? (
              <NoResults
                message={tMedia(
                  resourceType === 'artists'
                    ? 'music.no_artists_found'
                    : resourceType === 'albums'
                      ? 'music.no_albums_found'
                      : resourceType === 'tracks'
                        ? 'music.no_tracks_found'
                        : resourceType === 'episodes'
                          ? 'podcast.no_episodes_found'
                          : 'podcast.no_podcasts_found'
                )}
              />
            ) : !(isLoading && !isUpdating) ? (
              <>
                {readyFeeds.length > 0 && renderFeeds()}
                {showsNeedsCredentialsSection && (
                  <AddByRSSNeedsCredentialsSection feeds={needsCredentials} />
                )}
              </>
            ) : null}
            <WebLoadingSpinnerOverlay isLoading={isLoading && !isUpdating} />
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </>
  );
};
