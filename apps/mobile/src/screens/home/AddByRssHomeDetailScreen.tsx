import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Image, StyleSheet, Text, View } from 'react-native';

import { SortSelectRow } from '../../components/form/SortSelectRow';
import { MediaRowActions } from '../../components/player/MediaRowActions';
import { Button } from '../../components/primitives/Button';
import { ListEmpty } from '../../components/state/ListEmpty';
import { ListError } from '../../components/state/ListError';
import { ListLoading } from '../../components/state/ListLoading';
import { addByRssRepository, channelSeenRepository } from '../../data/repositories';
import { useAddByRssPlayback } from '../../hooks/useAddByRssPlayback';
import { homeFeedRefresh } from '../../lib/home/homeFeedRefresh';
import type { HomeStackParamList } from '../../navigation';
import {
  DEFAULT_PODCAST_EPISODE_SORT,
  readPodcastDetailPrefs,
  writePodcastDetailSort,
} from '../../prefs/detailListPrefs';
import { useTheme } from '../../theme/useTheme';
import type { AddByRssHomeDetailData } from './addByRssHomeDetailData';
import {
  buildAddByRssHomeDetailData,
  sortAddByRssHomeEpisodes,
} from './addByRssHomeDetailData';
import type { HomeFeedRowData } from './homeFeedData';
import { HomeFeedRow } from './HomeFeedRow';

type AddByRssHomeDetailScreenProps = NativeStackScreenProps<
  HomeStackParamList,
  'AddByRssPodcastDetail'
>;

type EpisodeSort = 'alphabetical' | 'recent';

const SORT_OPTIONS: { labelKey: string; value: EpisodeSort }[] = [
  { labelKey: 'filters.sort.a_z', value: 'alphabetical' },
  { labelKey: 'filters.sort.recent', value: 'recent' },
];

export function AddByRssHomeDetailScreen({
  navigation,
  route,
}: AddByRssHomeDetailScreenProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const [detail, setDetail] = useState<AddByRssHomeDetailData | null>(null);
  const [sort, setSort] = useState<EpisodeSort>(DEFAULT_PODCAST_EPISODE_SORT);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRemoving, setIsRemoving] = useState<boolean>(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [noticeKey, setNoticeKey] = useState<string | null>(null);
  const { playItem } = useAddByRssPlayback({ onNotice: setNoticeKey });

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
          borderRadius: tokens.radii.sm,
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
      const { sort: storedSort } = await readPodcastDetailPrefs(feed.idText);
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
      SORT_OPTIONS.map((option) => ({
        label: t(option.labelKey),
        testID: `add-by-rss-home-sort-${option.value}`,
        value: option.value,
      })),
    [t]
  );

  const listHeader = detail === null ? null : (
    <View style={styles.header}>
      {(detail.mappedFeed?.channel.images[0]?.url ?? detail.feed.imageUrl) !== null ? (
        <Image
          accessibilityLabel={
            detail.mappedFeed?.channel.channel.title ??
            detail.feed.title ??
            t('features.add_by_rss.label')
          }
          source={{
            uri: detail.mappedFeed?.channel.images[0]?.url ?? detail.feed.imageUrl ?? '',
          }}
          style={styles.headerImage}
        />
      ) : null}
      <Text style={styles.headerTitle}>
        {detail.mappedFeed?.channel.channel.title ?? detail.feed.title ?? detail.feed.feedUrl}
      </Text>
      <Text style={styles.headerUrl}>{detail.feed.feedUrl}</Text>
      <Text style={styles.headerUrl}>
        {t('misc.items')}: {sortedEpisodes.length}
      </Text>
      <View style={styles.removeButton}>
        <Button
          disabled={isRemoving}
          label={t('features.unsubscribe')}
          loading={isRemoving}
          onPress={() => {
            void handleRemove();
          }}
          testID="add-by-rss-home-remove"
          variant="secondary"
        />
      </View>
    </View>
  );

  return (
    <FlatList
      ListEmptyComponent={
        !isLoading && errorKey === null ? (
          <ListEmpty
            messageKey="features.add_by_rss.status_processing"
            testID="add-by-rss-home-empty"
          />
        ) : null
      }
      ListFooterComponent={
        noticeKey !== null || errorKey !== null ? (
          <View>
            {noticeKey !== null ? (
              <Text style={styles.notice} testID="add-by-rss-home-notice">
                {t(noticeKey)}
              </Text>
            ) : null}
            {errorKey !== null ? (
              <ListError
                messageKey={errorKey}
                onRetry={() => {
                  void loadDetail();
                }}
                testID="add-by-rss-home-error"
              />
            ) : null}
          </View>
        ) : null
      }
      ListHeaderComponent={
        <>
          {isLoading ? <ListLoading testID="add-by-rss-home-loading" /> : null}
          {listHeader}
          {detail !== null && errorKey === null ? (
            <>
              <Text style={styles.sectionTitle}>{t('media.podcast.episodes')}</Text>
              <SortSelectRow
                heading={t('filters.screen.sort_heading')}
                onSelect={(nextSort) => {
                  setSort(nextSort);
                  if (detail !== null) {
                    void writePodcastDetailSort(detail.feed.idText, nextSort);
                  }
                }}
                options={sortOptions}
                testID="add-by-rss-home-sort"
                value={sort}
              />
            </>
          ) : null}
        </>
      }
      contentContainerStyle={styles.content}
      data={errorKey === null && !isLoading ? sortedEpisodes : []}
      keyExtractor={(row) => row.id}
      renderItem={({ item: row }) => (
        <HomeFeedRow
          customActions={
            <MediaRowActions
              idSuffix={`-${row.id}`}
              onPlayPress={() => {
                handlePlay(row);
              }}
              playLabel={t('media_player.play')}
              playTestID={`add-by-rss-home-play-${row.id}`}
            />
          }
          mediaType="episodes"
          onPlayPress={() => {
            handlePlay(row);
          }}
          onPress={handlePlay}
          onQueuePress={() => undefined}
          row={row}
          testID={`add-by-rss-home-episode-${row.id}`}
        />
      )}
      testID="add-by-rss-home-detail-screen"
    />
  );
}
