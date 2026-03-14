'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { useEffect, useMemo, useState } from 'react';

import { isAlbumMediumId, parseMediumId } from '@podverse/helpers';
import { createAddByRSSIdText } from '@podverse/helpers';

import { AddByRSSArtistHeader } from '../../../components/AddByRSS/Artist/AddByRSSArtistHeader';
import Dropdown from '../../../components/Dropdown/Dropdown';
import LoadingSpinnerOverlay from '../../../components/LoadingSpinner/LoadingSpinnerOverlay';
import { MainInnerContentWrapper } from '../../../components/Main/MainInnerContentWrapper';
import { MainInnerWrapper } from '../../../components/Main/MainInnerWrapper';
import { MainWrapper } from '../../../components/Main/MainWrapper';
import { NoResults } from '../../../components/NoResults/NoResults';
import { SideContent } from '../../../components/SideContent/SideContent';
import { useLocalSettings } from '../../../contexts/LocalSettings';
import {
  buildAddByRSSItemsIndex,
  buildAddByRSSLivestreamIndex,
  buildItemIdTextMap,
} from '../../../utils/addByRSS/itemIndex';
import {
  getAddByRSSFeedByIdText,
  getAddByRSSFeedsByResourceType,
} from '../../../utils/addByRSS/storage';
import type {
  AddByRSSFeedRecord,
  AddByRSSItemIndexItem,
  AddByRSSLivestreamIndexItem,
} from '../../../utils/addByRSS/types';
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

const normalizeKey = (value?: string | null): string => (value ?? '').trim().toLowerCase();

const getArtistMatchKey = (feed: AddByRSSFeedRecord): string =>
  normalizeKey(
    feed.mappedFeed?.channel?.about?.author ??
      feed.mappedFeed?.channel?.channel?.title ??
      feed.title ??
      feed.feedUrl
  );

const matchesArtist = (feed: AddByRSSFeedRecord, artistKey: string): boolean => {
  if (!artistKey) {
    return false;
  }
  const author = normalizeKey(feed.mappedFeed?.channel?.about?.author ?? null);
  const title = normalizeKey(
    feed.mappedFeed?.channel?.channel?.title ?? feed.title ?? feed.feedUrl ?? null
  );
  return author === artistKey || title === artistKey;
};

type AddByRSSArtistPageClientProps = {
  idText: string;
};

export const AddByRSSArtistPageClient: React.FC<AddByRSSArtistPageClientProps> = ({ idText }) => {
  const tFeatures = useTranslations('features');
  const tFilters = useTranslations('filters');
  const tMisc = useTranslations('misc');
  const searchParams = useSearchParams();
  const { viewSelected } = useLocalSettings();

  const [feed, setFeed] = useState<AddByRSSFeedRecord | null>(null);
  const [albumFeeds, setAlbumFeeds] = useState<AddByRSSFeedRecord[]>([]);
  const [trackItems, setTrackItems] = useState<AddByRSSItemIndexItem[]>([]);
  const [liveItems, setLiveItems] = useState<AddByRSSLivestreamIndexItem[]>([]);
  const [activeTab, setActiveTab] = useState<AddByRSSArtistPageTabKey>('albums');
  const [isLoading, setIsLoading] = useState(true);

  const initialSort = useMemo(() => toSortOption(searchParams.get('sort')), [searchParams]);
  const [sort, setSort] = useState<SortOption>(initialSort);

  useEffect(() => {
    if (searchParams.has('sort')) {
      setSort(initialSort);
    }
  }, [initialSort, searchParams]);

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

    const loadRelated = async () => {
      const albums = await getAddByRSSFeedsByResourceType('albums');
      if (cancelled) {
        return;
      }
      const artistKey = getArtistMatchKey(feed);
      const filterAlbum = (record: AddByRSSFeedRecord) => {
        const mediumId = parseMediumId(record.mappedFeed?.channel?.channel?.medium_id);
        return isAlbumMediumId(mediumId);
      };
      const relatedAlbums = albums.filter(
        (record) => filterAlbum(record) && matchesArtist(record, artistKey)
      );
      setAlbumFeeds(relatedAlbums);

      // Build items index and extract track items from all related albums
      await buildAddByRSSItemsIndex(relatedAlbums);
      const livestreams = await buildAddByRSSLivestreamIndex(relatedAlbums);
      const map = await buildItemIdTextMap();
      if (cancelled) {
        return;
      }

      // Extract individual track items from album feeds
      const items: AddByRSSItemIndexItem[] = [];
      for (const albumFeed of relatedAlbums) {
        const feedItems = albumFeed.mappedFeed?.items ?? [];
        const channelTitle =
          albumFeed.mappedFeed?.channel?.channel?.title ?? albumFeed.title ?? albumFeed.feedUrl;
        const channelImageUrl =
          albumFeed.imageUrl ?? albumFeed.mappedFeed?.channel?.images?.[0]?.url ?? undefined;
        const mediumId = parseMediumId(albumFeed.mappedFeed?.channel?.channel?.medium_id);

        for (let i = 0; i < feedItems.length; i++) {
          const bundle = feedItems[i];
          if (!bundle) continue;
          const itemGuid = bundle.item?.guid ?? `${albumFeed.idText}-${i}`;
          const compositeId = `${albumFeed.idText}-${itemGuid}`;
          const itemIdText = map.get(compositeId) ?? createAddByRSSIdText();
          const pubDateMs = bundle.item?.pub_date ? new Date(bundle.item.pub_date).getTime() : 0;

          items.push({
            id: compositeId,
            idText: itemIdText,
            itemGuid,
            channelIdText: albumFeed.idText,
            channelTitle,
            channelImageUrl,
            mediumId,
            bundle,
            pubDateMs,
          });
        }
      }
      setTrackItems(items);
      setLiveItems(livestreams);
    };

    void loadRelated();

    return () => {
      cancelled = true;
    };
  }, [feed]);

  const sortedAlbums = useMemo(() => {
    const next = [...albumFeeds];
    next.sort((a, b) => {
      const aDate = getFeedLastPubDateMs(a);
      const bDate = getFeedLastPubDateMs(b);
      if (aDate === bDate) {
        return (a.title || a.feedUrl).localeCompare(b.title || b.feedUrl);
      }
      return sort === 'oldest' ? aDate - bDate : bDate - aDate;
    });
    return next;
  }, [albumFeeds, sort]);

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

  const sortedLiveItems = useMemo(() => {
    const next = [...liveItems];
    next.sort((a, b) => b.startTimeMs - a.startTimeMs);
    return next;
  }, [liveItems]);

  const description = feed?.mappedFeed?.channel?.description?.value ?? null;
  const hasAlbums = sortedAlbums.length > 0;
  const hasTracks = sortedTrackItems.length > 0;
  const hasDescription = !!description;

  useEffect(() => {
    const availableTabs: AddByRSSArtistPageTabKey[] = [];
    if (hasAlbums) {
      availableTabs.push('albums');
    }
    if (hasTracks) {
      availableTabs.push('tracks');
    }
    if (hasDescription) {
      availableTabs.push('about');
    }
    if (availableTabs.length === 0) {
      return;
    }
    if (!availableTabs.includes(activeTab)) {
      const nextTab = availableTabs[0];
      if (nextTab) {
        setActiveTab(nextTab);
      }
    }
  }, [activeTab, hasAlbums, hasDescription, hasTracks]);

  if (isLoading) {
    return <LoadingSpinnerOverlay isLoading message={tMisc('loading_your_content')} />;
  }

  if (!feed) {
    return (
      <MainWrapper>
        <MainInnerWrapper>
          <SideContent />
          <MainInnerContentWrapper>
            <NoResults message={tFeatures('add_by_rss.feed_not_found_local')} />
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    );
  }

  const sortMenuItems = [
    { label: tFilters('sort.recent'), param: 'sort', value: 'recent' },
    { label: tFilters('sort.oldest'), param: 'sort', value: 'oldest' },
  ];

  const sideButtons =
    activeTab === 'albums' || activeTab === 'tracks' ? (
      <Dropdown
        value={sort}
        menuItems={sortMenuItems}
        onChange={(value) => setSort(toSortOption(value))}
      />
    ) : null;

  const isEmptyActiveTab =
    (activeTab === 'albums' && !hasAlbums) ||
    (activeTab === 'tracks' && !hasTracks) ||
    (activeTab === 'about' && !hasDescription);

  return (
    <MainWrapper>
      <AddByRSSArtistHeader feed={feed} />
      <MainInnerWrapper>
        <SideContent />
        <MainInnerContentWrapper>
          <AddByRSSArtistPageListHeader
            selectedKey={activeTab}
            onSelect={setActiveTab}
            hasAlbums={hasAlbums}
            hasTracks={hasTracks}
            hasDescription={hasDescription}
            sideButtons={sideButtons}
          />
          {isEmptyActiveTab ? (
            <NoResults message={tFeatures('add_by_rss.no_feeds_music')} />
          ) : (
            <AddByRSSArtistPageList
              activeTab={activeTab}
              albumFeeds={sortedAlbums}
              trackItems={sortedTrackItems}
              liveItems={sortedLiveItems}
              description={description}
              viewSelected={viewSelected}
            />
          )}
        </MainInnerContentWrapper>
      </MainInnerWrapper>
    </MainWrapper>
  );
};
