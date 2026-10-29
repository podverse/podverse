'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { AddByRSSParseStatus, DTOChannel } from '@podverse/helpers';
import { isDescriptionTruncated } from '@podverse/helpers';
import { buildAddByRssBoostChannel } from '@podverse/parser-mapping';
import { CallToActionMessage, MainColumnStack, MainSidebarLayout, SideContent } from '@podverse/ui';

import { AddByRSSArtistHeader } from '../../../components/AddByRSS/Artist/AddByRSSArtistHeader';
import { AddByRSSRemoteItemList } from '../../../components/AddByRSS/RemoteItems/AddByRSSRemoteItemList';
import { useBoostMessagesView } from '../../../components/Boost/messages/useBoostMessagesView';
import { DetailListWrapper } from '../../../components/List/DetailListWrapper';
import { ListSortChip } from '../../../components/ListSortChip/ListSortChip';
import { WebLoadingYourContentSpinnerOverlay } from '../../../components/LoadingSpinner/WebLoadingSpinnerOverlay';
import { MainWrapper } from '../../../components/Main/MainWrapper';
import { NoResults } from '../../../components/NoResults/NoResults';
import { IMAGES } from '../../../constants/images';
import { useAccount } from '../../../contexts/Account';
import { useLocalSettings } from '../../../contexts/LocalSettings';
import { useModals } from '../../../contexts/Modals';
import { getApiRequestService } from '../../../factories/apiRequestService';
import { useAddByRSSRemoteItemList } from '../../../hooks/useAddByRSSRemoteItemList';
import {
  refreshAddByRSSPublisherLinks,
  resumeListedAddByRSSPolls,
} from '../../../utils/addByRSS/actions';
import { loadAddByRSSAlbumTrackIndexItems } from '../../../utils/addByRSS/albumTracks';
import { selectChannelOrderedLiveItems } from '../../../utils/addByRSS/channelLiveItems';
import type { AddByRSSNeedsCredentialsFeed } from '../../../utils/addByRSS/credentialsStatus';
import { getListedAddByRSSCredentialsNeed } from '../../../utils/addByRSS/credentialsStatus';
import { listFeedsWithCredentials } from '../../../utils/addByRSS/credentialStore';
import { onAddByRSSFeedChanged } from '../../../utils/addByRSS/feedChangedEvent';
import { buildAddByRSSLivestreamIndex } from '../../../utils/addByRSS/itemIndex';
import {
  addByRSSPublisherLinksNeedRefresh,
  toAddByRSSComparableFeedUrl,
} from '../../../utils/addByRSS/listedFeeds';
import type { AddByRSSArtistAlbumEntry } from '../../../utils/addByRSS/publisherLinks';
import {
  mergeAddByRSSAlbumSources,
  resolveAddByRSSArtistAlbums,
  resolveAddByRSSArtistTrackRefs,
} from '../../../utils/addByRSS/publisherLinks';
import {
  getAddByRSSFeedByIdText,
  getAddByRSSItemByGuid,
  getAddByRSSLivestreamByGuid,
  getAddByRSSPublisherLink,
  getAllAddByRSSFeeds,
  getAllListedAddByRSSFeeds,
} from '../../../utils/addByRSS/storage';
import type {
  AddByRSSFeedRecord,
  AddByRSSItemIndexItem,
  AddByRSSListedFeedRecord,
  AddByRSSLivestreamIndexItem,
} from '../../../utils/addByRSS/types';
import { addByRSSFeedListTitle } from '../../../utils/subscribed/channelListItems';
import { toAddByRSSArtistAlbumListItems } from './addByRSSArtistAlbumListItems';
import { AddByRSSArtistPageList } from './AddByRSSArtistPageList';
import type { AddByRSSArtistPageTabKey } from './AddByRSSArtistPageListHeader';
import { AddByRSSArtistPageListHeader } from './AddByRSSArtistPageListHeader';

type SortOption = 'recent' | 'oldest';

const toSortOption = (value: string | null): SortOption =>
  value === 'oldest' ? 'oldest' : 'recent';

const getFeedLastPubDateMs = (feed: AddByRSSFeedRecord): number => {
  const raw = feed.mappedFeed?.channel?.about?.last_pub_date ?? null;
  if (!raw) {
    return 0;
  }
  if (raw instanceof Date) {
    return raw.getTime();
  }
  const parsed = new Date(raw).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

/** A burst of album poll updates reloads the page once. */
const RELOAD_DEBOUNCE_MS = 300;
const DIRECTORY_CHANNEL_FETCH_CONCURRENCY = 5;

const getEntryLastPubDateMs = (
  entry: AddByRSSArtistAlbumEntry,
  directoryChannels: ReadonlyMap<string, DTOChannel>
): number => {
  if (entry.kind === 'add_by_rss') {
    return getFeedLastPubDateMs(entry.source.feed);
  }
  const raw = directoryChannels.get(entry.channelIdText)?.channel_about?.last_pub_date ?? null;
  if (!raw) {
    return 0;
  }
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const getEntryTitle = (
  entry: AddByRSSArtistAlbumEntry,
  directoryChannels: ReadonlyMap<string, DTOChannel>
): string =>
  entry.kind === 'add_by_rss'
    ? addByRSSFeedListTitle(entry.source.feed)
    : (directoryChannels.get(entry.channelIdText)?.title ?? entry.title);

/** Fetches each directory album channel, a few at a time. A failed fetch keeps the listed title. */
const fetchDirectoryAlbumChannels = async (
  channelIdTexts: readonly string[],
  onChannel: (channelIdText: string, channel: DTOChannel) => void
): Promise<void> => {
  const pending = [...channelIdTexts];
  const api = getApiRequestService();
  const worker = async (): Promise<void> => {
    let channelIdText = pending.shift();
    while (channelIdText !== undefined) {
      try {
        onChannel(channelIdText, await api.reqChannelGetByIdOrIdText(channelIdText));
      } catch (error) {
        console.error('Directory album could not be loaded', { channelIdText, error });
      }
      channelIdText = pending.shift();
    }
  };
  const workerCount = Math.min(DIRECTORY_CHANNEL_FETCH_CONCURRENCY, pending.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
};

type AddByRSSArtistPageClientProps = {
  idText: string;
};

export const AddByRSSArtistPageClient: React.FC<AddByRSSArtistPageClientProps> = ({ idText }) => {
  const tFeatures = useTranslations('features');
  const tFilters = useTranslations('filters');
  const tInstructions = useTranslations('instructions');
  const tAuthentication = useTranslations('authentication');
  const tV4VBoostMessages = useTranslations('v4v.boost_messages');
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { viewSelected } = useLocalSettings();
  const { loggedInAccount } = useAccount();
  const { setModalAuthLogin } = useModals();

  const accountId = loggedInAccount?.id_text ?? null;

  const [feed, setFeed] = useState<AddByRSSFeedRecord | null>(null);
  const [albumEntries, setAlbumEntries] = useState<AddByRSSArtistAlbumEntry[]>([]);
  const [directoryChannels, setDirectoryChannels] = useState<Map<string, DTOChannel>>(
    () => new Map()
  );
  const [needsCredentials, setNeedsCredentials] = useState<AddByRSSNeedsCredentialsFeed[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [trackItems, setTrackItems] = useState<AddByRSSItemIndexItem[]>([]);
  const [liveItems, setLiveItems] = useState<AddByRSSLivestreamIndexItem[]>([]);
  const initialType = useMemo<AddByRSSArtistPageTabKey>(() => {
    const typeParam = searchParams.get('type');
    if (
      typeParam === 'tracks' ||
      typeParam === 'boosts' ||
      typeParam === 'about' ||
      typeParam === 'settings' ||
      typeParam === 'podroll'
    ) {
      return typeParam;
    }
    return 'albums';
  }, [searchParams]);
  const [activeTab, setActiveTab] = useState<AddByRSSArtistPageTabKey>(initialType);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedRelated, setHasLoadedRelated] = useState(false);
  /**
   * The tab the page left on its own because it had nothing to show. The page returns to it once
   * it has content, because an artist's albums can be stored after the page opens.
   */
  const fallbackFromTabRef = useRef<AddByRSSArtistPageTabKey | null>(null);
  /** Comparable URLs whose change reloads the page: the artist's albums and list rows. */
  const watchedFeedUrlsRef = useRef<ReadonlySet<string>>(new Set());
  const freshnessCheckedIdTextRef = useRef<string | null>(null);
  const requestedDirectoryIdsRef = useRef<Set<string>>(new Set());

  const initialSort = useMemo(() => toSortOption(searchParams.get('sort')), [searchParams]);
  const [sort, setSort] = useState<SortOption>(initialSort);

  useEffect(() => {
    if (searchParams.has('sort') || searchParams.has('type')) {
      setSort(initialSort);
      setActiveTab(initialType);
    }
  }, [initialSort, initialType, searchParams]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      const record = await getAddByRSSFeedByIdText(idText);
      if (cancelled) {
        return;
      }
      setFeed(record);
      setIsLoading(false);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [idText]);

  useEffect(() => {
    if (!feed) {
      return;
    }
    let cancelled = false;

    const readCredentialUrls = async (): Promise<ReadonlySet<string>> => {
      if (accountId === null) {
        return new Set();
      }
      try {
        const feedUrls = await listFeedsWithCredentials(accountId);
        return new Set(feedUrls.map(toAddByRSSComparableFeedUrl));
      } catch (error) {
        console.error(error);
        return new Set();
      }
    };

    const loadRelated = async () => {
      const artistUrl = toAddByRSSComparableFeedUrl(feed.feedUrl);
      const [followed, listed, link, credentialUrls] = await Promise.all([
        getAllAddByRSSFeeds(),
        getAllListedAddByRSSFeeds(),
        getAddByRSSPublisherLink(artistUrl),
        readCredentialUrls(),
      ]);
      if (cancelled) {
        return;
      }

      const sources = mergeAddByRSSAlbumSources(followed, listed);
      const entries = resolveAddByRSSArtistAlbums({ artist: feed, link, sources });

      const listedInEntries: AddByRSSListedFeedRecord[] = [];
      const nextNeedsCredentials: AddByRSSNeedsCredentialsFeed[] = [];
      for (const entry of entries) {
        if (entry.kind !== 'add_by_rss' || entry.source.followed) {
          continue;
        }
        const listedFeed = entry.source.feed;
        listedInEntries.push(listedFeed);
        const need = getListedAddByRSSCredentialsNeed(
          listedFeed,
          credentialUrls.has(toAddByRSSComparableFeedUrl(listedFeed.feedUrl))
        );
        if (need !== null) {
          nextNeedsCredentials.push({ feed: listedFeed, need });
        }
      }

      const watched = new Set<string>();
      for (const record of listed) {
        watched.add(toAddByRSSComparableFeedUrl(record.feedUrl));
      }
      for (const entry of entries) {
        if (entry.kind === 'add_by_rss') {
          watched.add(toAddByRSSComparableFeedUrl(entry.source.feed.feedUrl));
        }
      }
      for (const row of link?.listedFeeds ?? []) {
        if (row.feedUrl !== null) {
          watched.add(toAddByRSSComparableFeedUrl(row.feedUrl));
        }
      }
      watchedFeedUrlsRef.current = watched;

      setAlbumEntries(entries);
      setNeedsCredentials(nextNeedsCredentials);

      if (accountId !== null && freshnessCheckedIdTextRef.current !== feed.idText) {
        freshnessCheckedIdTextRef.current = feed.idText;
        if (addByRSSPublisherLinksNeedRefresh(link, Date.now())) {
          void refreshAddByRSSPublisherLinks({ accountId, publisher: feed });
        } else {
          void resumeListedAddByRSSPolls(listedInEntries);
        }
      }

      const needsCredentialsIdTexts = new Set(
        nextNeedsCredentials.map((entry) => entry.feed.idText)
      );
      const refs = resolveAddByRSSArtistTrackRefs({ link, albums: entries, sources }).filter(
        (ref) => !needsCredentialsIdTexts.has(ref.source.feed.idText)
      );
      const tracks = await loadAddByRSSAlbumTrackIndexItems(refs);
      if (cancelled) {
        return;
      }
      setTrackItems(tracks);
      setHasLoadedRelated(true);

      // The builder replaces the whole livestream index, so it always gets every followed feed.
      const followedAlbumIdTexts = new Set<string>();
      for (const entry of entries) {
        if (entry.kind === 'add_by_rss' && entry.source.followed) {
          followedAlbumIdTexts.add(entry.source.feed.idText);
        }
      }
      const livestreams = await buildAddByRSSLivestreamIndex(followed);
      if (cancelled) {
        return;
      }
      setLiveItems(livestreams.filter((item) => followedAlbumIdTexts.has(item.channelIdText)));
    };

    void loadRelated();

    return () => {
      cancelled = true;
    };
  }, [accountId, feed, reloadKey]);

  useEffect(() => {
    if (!feed) {
      return;
    }
    const artistUrl = toAddByRSSComparableFeedUrl(feed.feedUrl);
    let reloadTimer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = onAddByRSSFeedChanged((changedUrl) => {
      if (changedUrl !== artistUrl && !watchedFeedUrlsRef.current.has(changedUrl)) {
        return;
      }
      if (reloadTimer !== null) {
        clearTimeout(reloadTimer);
      }
      reloadTimer = setTimeout(() => {
        reloadTimer = null;
        setReloadKey((key) => key + 1);
      }, RELOAD_DEBOUNCE_MS);
    });
    return () => {
      unsubscribe();
      if (reloadTimer !== null) {
        clearTimeout(reloadTimer);
      }
    };
  }, [feed]);

  const directoryIdsKey = useMemo(() => {
    const ids = new Set<string>();
    for (const entry of albumEntries) {
      if (entry.kind === 'directory') {
        ids.add(entry.channelIdText);
      }
    }
    return [...ids].sort().join('|');
  }, [albumEntries]);

  useEffect(() => {
    if (directoryIdsKey === '' || accountId === null) {
      return;
    }
    const missing = directoryIdsKey
      .split('|')
      .filter((channelIdText) => !requestedDirectoryIdsRef.current.has(channelIdText));
    if (missing.length === 0) {
      return;
    }
    for (const channelIdText of missing) {
      requestedDirectoryIdsRef.current.add(channelIdText);
    }
    void fetchDirectoryAlbumChannels(missing, (channelIdText, channel) => {
      setDirectoryChannels((previous) => new Map(previous).set(channelIdText, channel));
    });
  }, [accountId, directoryIdsKey]);

  const statusLabel = useCallback(
    (status: AddByRSSParseStatus): string => {
      switch (status) {
        case 'queued':
          return tFeatures('add_by_rss.status_queued');
        case 'processing':
          return tFeatures('add_by_rss.status_processing');
        case 'parsed':
          return tFeatures('add_by_rss.status_parsed');
        case 'not_modified':
          return tFeatures('add_by_rss.status_not_modified');
        case 'failed':
          return tFeatures('add_by_rss.status_failed');
      }
    },
    [tFeatures]
  );

  const sortedAlbumItems = useMemo(() => {
    const sortedEntries = [...albumEntries];
    sortedEntries.sort((a, b) => {
      const aDate = getEntryLastPubDateMs(a, directoryChannels);
      const bDate = getEntryLastPubDateMs(b, directoryChannels);
      if (aDate === bDate) {
        return getEntryTitle(a, directoryChannels).localeCompare(
          getEntryTitle(b, directoryChannels)
        );
      }
      return sort === 'oldest' ? aDate - bDate : bDate - aDate;
    });
    return toAddByRSSArtistAlbumListItems({
      entries: sortedEntries,
      directoryChannels,
      needsCredentialsIdTexts: new Set(needsCredentials.map((entry) => entry.feed.idText)),
      statusLabel,
      imageSize: IMAGES.LIST.PODCASTS.SIZE_FIND_TARGET,
    });
  }, [albumEntries, directoryChannels, needsCredentials, sort, statusLabel]);

  const sortedTrackItems = useMemo(() => {
    const next = [...trackItems];
    next.sort((a, b) => {
      if (a.pubDateMs === b.pubDateMs) {
        return (a.bundle?.item?.title ?? '').localeCompare(b.bundle?.item?.title ?? '');
      }
      return sort === 'oldest' ? a.pubDateMs - b.pubDateMs : b.pubDateMs - a.pubDateMs;
    });
    return next;
  }, [trackItems, sort]);

  const sortedLiveItems = useMemo(() => selectChannelOrderedLiveItems(liveItems), [liveItems]);

  const description = feed?.mappedFeed?.channel?.description?.value ?? null;
  const hasAlbums = sortedAlbumItems.length > 0 || needsCredentials.length > 0;
  const hasTracks = sortedTrackItems.length > 0;
  const hasDescription = !!description;
  const boostChannel = useMemo(() => (feed ? buildAddByRssBoostChannel(feed) : null), [feed]);
  const { canShowBoostTab, boostsPageFetcher, breadcrumbLinkResolver, refreshTrigger } =
    useBoostMessagesView({
      channel: boostChannel,
      scopeType: 'artist',
      channelIdText: feed?.idText ?? null,
      resolveChannelHref: (channelIdText) => `/add-by-rss/artist/${channelIdText}`,
      resolveItemIdTextByGuid: async (itemGuid) => {
        const item = await getAddByRSSItemByGuid(itemGuid);
        if (item?.idText) {
          return item.idText;
        }

        const livestream = await getAddByRSSLivestreamByGuid(itemGuid);
        return livestream?.idText ?? null;
      },
      resolveItemHref: (itemIdText) => `/add-by-rss/track/${itemIdText}`,
    });
  const podroll = useAddByRSSRemoteItemList(feed, 'podroll');
  const hasPodroll = podroll.hasRows;
  const handleTabSelect = React.useCallback(
    (key: AddByRSSArtistPageTabKey) => {
      setActiveTab(key);
      const nextParams = new URLSearchParams(searchParams.toString());
      if (key === 'albums') {
        nextParams.delete('type');
      } else {
        nextParams.set('type', key);
      }
      const nextQuery = nextParams.toString();
      router.replace(nextQuery === '' ? pathname : `${pathname}?${nextQuery}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const handleUserTabSelect = useCallback(
    (key: AddByRSSArtistPageTabKey) => {
      fallbackFromTabRef.current = null;
      handleTabSelect(key);
    },
    [handleTabSelect]
  );

  useEffect(() => {
    if (isLoading || !hasLoadedRelated) {
      return;
    }
    const availableTabs: AddByRSSArtistPageTabKey[] = [];
    if (hasAlbums) {
      availableTabs.push('albums');
    }
    if (hasTracks) {
      availableTabs.push('tracks');
    }
    if (canShowBoostTab) {
      availableTabs.push('boosts');
    }
    if (hasDescription) {
      availableTabs.push('about');
    }
    if (hasPodroll) {
      availableTabs.push('podroll');
    }
    availableTabs.push('settings');
    if (availableTabs.length === 0) {
      return;
    }
    const fallbackFromTab = fallbackFromTabRef.current;
    if (
      fallbackFromTab !== null &&
      fallbackFromTab !== activeTab &&
      availableTabs.includes(fallbackFromTab)
    ) {
      fallbackFromTabRef.current = null;
      handleTabSelect(fallbackFromTab);
      return;
    }
    if (!availableTabs.includes(activeTab)) {
      if (activeTab === 'podroll') {
        return;
      }
      const nextTab = availableTabs[0];
      if (nextTab) {
        fallbackFromTabRef.current ??= activeTab;
        handleTabSelect(nextTab);
      }
    }
  }, [
    activeTab,
    canShowBoostTab,
    handleTabSelect,
    hasAlbums,
    hasDescription,
    hasLoadedRelated,
    hasPodroll,
    hasTracks,
    isLoading,
  ]);

  useEffect(() => {
    if (isLoading || feed === null) {
      return;
    }
    if (!hasPodroll && activeTab === 'podroll') {
      handleTabSelect('albums');
    }
  }, [activeTab, feed, handleTabSelect, hasPodroll, isLoading]);

  if (isLoading) {
    return <WebLoadingYourContentSpinnerOverlay isLoading />;
  }

  if (!feed) {
    return (
      <MainWrapper>
        <MainSidebarLayout>
          <SideContent />
          <MainColumnStack>
            <NoResults message={tFeatures('add_by_rss.feed_not_found_local')} />
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    );
  }

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'recent', label: tFilters('sort.recent') },
    { value: 'oldest', label: tFilters('sort.oldest') },
  ];

  const isEmptyActiveTab =
    activeTab !== 'settings' &&
    ((activeTab === 'albums' && !hasAlbums) ||
      (activeTab === 'tracks' && !hasTracks) ||
      (activeTab === 'boosts' && boostsPageFetcher === null) ||
      (activeTab === 'about' && !hasDescription));

  return (
    <MainWrapper>
      <AddByRSSArtistHeader feed={feed} />
      <MainSidebarLayout>
        <SideContent />
        <MainColumnStack>
          <AddByRSSArtistPageListHeader
            selectedKey={activeTab}
            onSelect={handleUserTabSelect}
            hasAlbums={hasAlbums}
            hasTracks={hasTracks}
            canShowBoosts={canShowBoostTab}
            hasDescription={hasDescription}
            hasPodroll={hasPodroll}
            trailing={
              activeTab === 'albums' || activeTab === 'tracks' ? (
                <ListSortChip
                  onChange={(nextSort) => {
                    setSort(toSortOption(nextSort));
                  }}
                  options={sortOptions}
                  position="right"
                  range={null}
                  testId="add-by-rss-artist-detail-sort"
                  value={sort}
                />
              ) : null
            }
          />
          {activeTab === 'podroll' ? (
            <DetailListWrapper>
              <AddByRSSRemoteItemList
                rows={podroll.rows}
                openReference={podroll.openReference}
                openingKey={podroll.openingKey}
                errorMessage={podroll.errorMessage}
              />
            </DetailListWrapper>
          ) : isEmptyActiveTab ? (
            <NoResults message={tFeatures('add_by_rss.no_feeds_music')} />
          ) : (
            <AddByRSSArtistPageList
              activeTab={activeTab}
              albumItems={sortedAlbumItems}
              needsCredentials={needsCredentials}
              trackItems={sortedTrackItems}
              liveItems={sortedLiveItems}
              description={description}
              descriptionIsTruncated={isDescriptionTruncated(
                feed?.mappedFeed?.channel?.description
              )}
              fullDescriptionUrl={feed?.mappedFeed?.channel?.about?.website_link_url ?? null}
              viewSelected={viewSelected}
              boostsPageFetcher={boostsPageFetcher}
              breadcrumbLinkResolver={breadcrumbLinkResolver}
              refreshTrigger={refreshTrigger}
              boostsHeading={tV4VBoostMessages('title')}
              accountIdText={loggedInAccount?.id_text ?? null}
              settingsFeed={feed}
              onSettingsFeedUpdated={setFeed}
              loginPrompt={
                !loggedInAccount ? (
                  <CallToActionMessage
                    message={tInstructions('login_for_subscriptions')}
                    buttonLabel={tAuthentication('login')}
                    onButtonClick={() => setModalAuthLogin({ isOpen: true })}
                  />
                ) : null
              }
            />
          )}
        </MainColumnStack>
      </MainSidebarLayout>
    </MainWrapper>
  );
};
