'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { MediumEnum } from '@podverse/helpers';

import { AddByRSSArtistHeader } from '../../../components/AddByRSS/Artist/AddByRSSArtistHeader';
import { MainInnerContentWrapper } from '../../../components/Main/MainInnerContentWrapper';
import { MainInnerWrapper } from '../../../components/Main/MainInnerWrapper';
import { MainWrapper } from '../../../components/Main/MainWrapper';
import LoadingSpinnerOverlay from '../../../components/LoadingSpinner/LoadingSpinnerOverlay';
import { NoResults } from '../../../components/NoResults/NoResults';
import { SideContent } from '../../../components/SideContent/SideContent';
import Dropdown from '../../../components/Dropdown/Dropdown';
import { useLocalSettings } from '../../../contexts/LocalSettings';
import {
  getAddByRSSFeedByIdText,
  getAddByRSSFeedsByResourceType,
} from '../../../utils/addByRSS/storage';
import type { AddByRSSFeedRecord } from '../../../utils/addByRSS/types';
import { AddByRSSArtistPageListHeader } from './AddByRSSArtistPageListHeader';
import type { AddByRSSArtistPageTabKey } from './AddByRSSArtistPageListHeader';
import { AddByRSSArtistPageList } from './AddByRSSArtistPageList';

type SortOption = 'recent' | 'oldest';

const toSortOption = (value: string | null): SortOption =>
  value === 'oldest' ? 'oldest' : 'recent';

const parseMediumId = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

const isMusicMedium = (mediumId: number | null): boolean =>
  mediumId === MediumEnum.Music ||
  mediumId === MediumEnum.MusicL ||
  mediumId === MediumEnum.PublisherMusic;

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
  const [trackFeeds, setTrackFeeds] = useState<AddByRSSFeedRecord[]>([]);
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
      const [albums, tracks] = await Promise.all([
        getAddByRSSFeedsByResourceType('albums'),
        getAddByRSSFeedsByResourceType('tracks'),
      ]);
      if (cancelled) {
        return;
      }
      const artistKey = getArtistMatchKey(feed);
      const filterMusic = (record: AddByRSSFeedRecord) => {
        const mediumId = parseMediumId(record.mappedFeed?.channel?.channel?.medium_id);
        return isMusicMedium(mediumId);
      };
      const relatedAlbums = albums.filter(
        (record) => filterMusic(record) && matchesArtist(record, artistKey)
      );
      const relatedTracks = tracks.filter(
        (record) => filterMusic(record) && matchesArtist(record, artistKey)
      );
      setAlbumFeeds(relatedAlbums);
      setTrackFeeds(relatedTracks);
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

  const sortedTracks = useMemo(() => {
    const next = [...trackFeeds];
    next.sort((a, b) => {
      const aDate = getFeedLastPubDateMs(a);
      const bDate = getFeedLastPubDateMs(b);
      if (aDate === bDate) {
        return (a.title || a.feedUrl).localeCompare(b.title || b.feedUrl);
      }
      return sort === 'oldest' ? aDate - bDate : bDate - aDate;
    });
    return next;
  }, [trackFeeds, sort]);

  const description = feed?.mappedFeed?.channel?.description?.value ?? null;
  const hasAlbums = sortedAlbums.length > 0;
  const hasTracks = sortedTracks.length > 0;
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
              trackFeeds={sortedTracks}
              description={description}
              viewSelected={viewSelected}
            />
          )}
        </MainInnerContentWrapper>
      </MainInnerWrapper>
    </MainWrapper>
  );
};
