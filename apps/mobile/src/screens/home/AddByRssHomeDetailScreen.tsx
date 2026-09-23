import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import {
  addByRSSFeedListArtworkCandidates,
  ARTWORK_LIST_SIZE_FIND_TARGET,
  primaryChannelLightboxArtworkUrl,
} from '@podverse/helpers';

import { SortSelectRow } from '../../components/form/SortSelectRow';
import { MediaRowActions } from '../../components/player/MediaRowActions';
import { Button, CoverImage, LIST_REMOVE_CLIPPED_SUBVIEWS } from '../../components/primitives';
import { ListEmpty } from '../../components/state/ListEmpty';
import { ListError } from '../../components/state/ListError';
import { ListLoading } from '../../components/state/ListLoading';
import { isMobileE2eFromEnv } from '../../config/env';
import { addByRssRepository, channelSeenRepository } from '../../data/repositories';
import { useAddByRssPlayback } from '../../hooks/useAddByRssPlayback';
import { homeFeedRefresh } from '../../lib/home/homeFeedRefresh';
import type { HomeStackParamList } from '../../navigation';
import type { AddByRssEpisodeSort } from '../../prefs/detailListPrefs';
import {
  ADD_BY_RSS_EPISODE_SORT_OPTIONS,
  DEFAULT_ADD_BY_RSS_EPISODE_SORT,
  readAddByRssDetailPrefs,
  writeAddByRssDetailSort,
} from '../../prefs/detailListPrefs';
import { useTheme } from '../../theme/useTheme';
import type { AddByRssHomeDetailData } from './addByRssHomeDetailData';
import { buildAddByRssHomeDetailData, sortAddByRssHomeEpisodes } from './addByRssHomeDetailData';
import type { HomeFeedRowData } from './homeFeedData';
import { HomeFeedRow } from './HomeFeedRow';
import type { QueueActionPosition } from './useHomeRowPlayback';

type AddByRssHomeDetailScreenProps = NativeStackScreenProps<
  HomeStackParamList,
  'AddByRssPodcastDetail'
>;

const SORT_LABEL_KEYS: Record<AddByRssEpisodeSort, string> = {
  alphabetical: 'filters.sort.a_z',
  recent: 'filters.sort.recent',
};

const addByRssEpisodeKeyExtractor = (row: HomeFeedRowData): string => row.id;

const noopQueuePress = (_row: HomeFeedRowData, _position: QueueActionPosition): void => undefined;

function AddByRssEpisodeRow({
  index,
  isLast,
  onPlay,
  row,
}: {
  index: number;
  isLast: boolean;
  onPlay: (row: HomeFeedRowData) => void;
  row: HomeFeedRowData;
}) {
  const { t } = useTranslation();
  const handlePlay = useCallback(() => {
    onPlay(row);
  }, [onPlay, row]);

  const customActions = useMemo(
    () => (
      <MediaRowActions
        appearance="icons"
        durationLabel={null}
        idSuffix={`-${row.id}`}
        onPlayPress={handlePlay}
        playLabel={t('media_player.play')}
        playTestID={index === 0 ? 'add-by-rss-home-play-first' : `add-by-rss-home-play-${row.id}`}
      />
    ),
    [handlePlay, index, row.id, t]
  );

  return (
    <HomeFeedRow
      customActions={customActions}
      isLast={isLast}
      mediaType="episodes"
      onPlayPress={handlePlay}
      onPress={onPlay}
      onQueuePress={noopQueuePress}
      row={row}
      showChannelContext={false}
      testID={`add-by-rss-home-episode-${row.id}`}
    />
  );
}

export function AddByRssHomeDetailScreen({ navigation, route }: AddByRssHomeDetailScreenProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const [detail, setDetail] = useState<AddByRssHomeDetailData | null>(null);
  const [sort, setSort] = useState<AddByRssEpisodeSort>(DEFAULT_ADD_BY_RSS_EPISODE_SORT);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRemoving, setIsRemoving] = useState<boolean>(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [noticeKey, setNoticeKey] = useState<string | null>(null);
  const { playItem, isPlaybackActive } = useAddByRssPlayback({ onNotice: setNoticeKey });

  const styles = useMemo(
    () =>
      StyleSheet.create({
        content: {
          padding: tokens.spacing.lg,
          paddingBottom: tokens.spacing['2xl'],
        },
        header: {
          backgroundColor: tokens.background.secondary,
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.md,
          borderWidth: 1,
          marginBottom: tokens.spacing.lg,
          padding: tokens.spacing.lg,
        },
        headerImage: {
          height: 96,
          marginBottom: tokens.spacing.md,
          width: 96,
        },
        headerTitle: {
          color: themeStyles.textPrimary.color,
          fontSize: 24,
          fontWeight: '700',
        },
        headerUrl: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          marginTop: tokens.spacing.xs,
        },
        notice: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          marginBottom: tokens.spacing.sm,
        },
        removeButton: {
          marginTop: tokens.spacing.md,
        },
        sectionTitle: {
          color: themeStyles.textPrimary.color,
          fontSize: 20,
          fontWeight: '700',
          marginBottom: tokens.spacing.sm,
        },
      }),
    [themeStyles, tokens]
  );

  const loadDetail = useCallback(async () => {
    setIsLoading(true);
    setErrorKey(null);
    try {
      const feed = await addByRssRepository.getFeedByIdText(route.params.feedIdText);
      if (feed === null) {
        setErrorKey('errors.generic');
        return;
      }

      const mappedFeed = await addByRssRepository.getMappedFeedByUrl(feed.feedUrl);
      const { sort: storedSort } = await readAddByRssDetailPrefs(feed.idText);
      setSort(storedSort);
      setDetail(
        mappedFeed === null
          ? { episodeRows: [], feed, mappedFeed: null }
          : buildAddByRssHomeDetailData(feed, mappedFeed)
      );
      await channelSeenRepository.markSeen(feed.feedUrl, 'add-by-rss');
    } catch {
      setErrorKey('errors.generic');
    } finally {
      setIsLoading(false);
    }
  }, [route.params.feedIdText]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const handleRemove = useCallback(async () => {
    if (detail === null || isRemoving) {
      return;
    }

    setIsRemoving(true);
    setErrorKey(null);
    try {
      await addByRssRepository.removeFeed(detail.feed.feedUrl);
      homeFeedRefresh.notify();
      navigation.goBack();
    } catch {
      setErrorKey('errors.generic');
    } finally {
      setIsRemoving(false);
    }
  }, [detail, isRemoving, navigation]);

  const handlePlay = useCallback(
    (row: HomeFeedRowData) => {
      if (detail === null || detail.mappedFeed === null) {
        setNoticeKey('features.add_by_rss.status_processing');
        return;
      }

      const episode = detail.episodeRows.find((candidate) => candidate.id === row.id);
      if (episode === undefined) {
        setNoticeKey('features.add_by_rss.status_processing');
        return;
      }

      void playItem(detail.feed, detail.mappedFeed, episode.itemBundle, episode.itemIndex);
    },
    [detail, playItem]
  );

  const sortedEpisodes = useMemo(() => {
    if (detail === null) {
      return [];
    }
    return sortAddByRssHomeEpisodes(detail.episodeRows, sort);
  }, [detail, sort]);

  const sortOptions = useMemo(
    () =>
      ADD_BY_RSS_EPISODE_SORT_OPTIONS.map((option) => ({
        label: t(SORT_LABEL_KEYS[option]),
        testID: `add-by-rss-home-sort-${option}`,
        value: option,
      })),
    [t]
  );

  const headerArtwork = useMemo(() => {
    if (detail === null) {
      return { listUrl: null, viewerUrl: null };
    }

    const listUrl =
      addByRSSFeedListArtworkCandidates({
        channelImages: detail.mappedFeed?.channel.images,
        comparison: 'lesser',
        feedImageUrl: detail.feed.imageUrl,
        sizeFindTarget: ARTWORK_LIST_SIZE_FIND_TARGET,
      })[0] ?? null;

    return {
      listUrl,
      viewerUrl: primaryChannelLightboxArtworkUrl(detail.mappedFeed?.channel.images) ?? listUrl,
    };
  }, [detail]);

  const handleRemovePress = useCallback(() => {
    void handleRemove();
  }, [handleRemove]);

  const handleRetryDetail = useCallback(() => {
    void loadDetail();
  }, [loadDetail]);

  const handleSortSelect = useCallback(
    (nextSort: AddByRssEpisodeSort) => {
      setSort(nextSort);
      if (detail !== null) {
        void writeAddByRssDetailSort(detail.feed.idText, nextSort);
      }
    },
    [detail]
  );

  const episodeCount = sortedEpisodes.length;

  const listHeader = useMemo(
    () =>
      detail === null ? null : (
        <View style={styles.header}>
          <CoverImage
            accessibilityLabel={
              detail.mappedFeed?.channel.channel.title ??
              detail.feed.title ??
              t('features.add_by_rss.label')
            }
            style={styles.headerImage}
            uri={headerArtwork.listUrl}
            viewerUri={headerArtwork.viewerUrl}
          />
          <Text style={styles.headerTitle}>
            {detail.mappedFeed?.channel.channel.title ?? detail.feed.title ?? detail.feed.feedUrl}
          </Text>
          <Text style={styles.headerUrl}>{detail.feed.feedUrl}</Text>
          <Text style={styles.headerUrl}>
            {t('misc.items')}: {episodeCount}
          </Text>
          <View style={styles.removeButton}>
            <Button
              disabled={isRemoving}
              label={t('features.unsubscribe')}
              loading={isRemoving}
              onPress={handleRemovePress}
              testID="add-by-rss-home-remove"
              variant="secondary"
            />
          </View>
        </View>
      ),
    [
      detail,
      episodeCount,
      handleRemovePress,
      headerArtwork.listUrl,
      headerArtwork.viewerUrl,
      isRemoving,
      styles.header,
      styles.headerImage,
      styles.headerTitle,
      styles.headerUrl,
      styles.removeButton,
      t,
    ]
  );

  const listEmpty = useMemo(
    () =>
      !isLoading && errorKey === null ? (
        <ListEmpty
          messageKey="features.add_by_rss.status_processing"
          testID="add-by-rss-home-empty"
        />
      ) : null,
    [errorKey, isLoading]
  );

  const listFooter = useMemo(
    () =>
      noticeKey !== null || errorKey !== null || (isMobileE2eFromEnv() && isPlaybackActive) ? (
        <View>
          {noticeKey !== null ? (
            <Text style={styles.notice} testID="add-by-rss-home-notice">
              {t(noticeKey)}
            </Text>
          ) : null}
          {errorKey !== null ? (
            <ListError
              messageKey={errorKey}
              onRetry={handleRetryDetail}
              testID="add-by-rss-home-error"
            />
          ) : null}
          {isMobileE2eFromEnv() && isPlaybackActive ? (
            <Text
              accessibilityLabel="add-by-rss-home-playback-active"
              style={styles.notice}
              testID="add-by-rss-home-playback-active"
            >
              {t('media_player.play')}
            </Text>
          ) : null}
        </View>
      ) : null,
    [errorKey, handleRetryDetail, isPlaybackActive, noticeKey, styles.notice, t]
  );

  const listHeaderComponent = useMemo(
    () => (
      <>
        {isLoading ? <ListLoading testID="add-by-rss-home-loading" /> : null}
        {listHeader}
        {detail !== null && errorKey === null ? (
          <>
            <Text style={styles.sectionTitle}>{t('media.podcast.episodes')}</Text>
            <SortSelectRow
              heading={t('filters.screen.sort_heading')}
              onSelect={handleSortSelect}
              options={sortOptions}
              testID="add-by-rss-home-sort"
              value={sort}
            />
          </>
        ) : null}
      </>
    ),
    [
      detail,
      errorKey,
      handleSortSelect,
      isLoading,
      listHeader,
      sort,
      sortOptions,
      styles.sectionTitle,
      t,
    ]
  );

  const renderItem = useCallback(
    ({ index, item: row }: { index: number; item: HomeFeedRowData }) => (
      <AddByRssEpisodeRow
        index={index}
        isLast={index === episodeCount - 1}
        onPlay={handlePlay}
        row={row}
      />
    ),
    [episodeCount, handlePlay]
  );

  return (
    <FlatList
      ListEmptyComponent={listEmpty}
      ListFooterComponent={listFooter}
      ListHeaderComponent={listHeaderComponent}
      contentContainerStyle={styles.content}
      data={errorKey === null && !isLoading ? sortedEpisodes : []}
      keyExtractor={addByRssEpisodeKeyExtractor}
      removeClippedSubviews={LIST_REMOVE_CLIPPED_SUBVIEWS}
      renderItem={renderItem}
      testID="add-by-rss-home-detail-screen"
    />
  );
}
