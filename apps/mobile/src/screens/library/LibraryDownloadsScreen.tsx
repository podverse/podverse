import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';

import { Button } from '../../components/primitives/Button';
import { CoverImage } from '../../components/primitives/CoverImage';
import { ProgressTrack } from '../../components/primitives/ProgressTrack';
import { SwipeActionRow } from '../../components/primitives/SwipeActionRow';
import { ListEmpty } from '../../components/state/ListEmpty';
import { ListError } from '../../components/state/ListError';
import { ListLoading } from '../../components/state/ListLoading';
import { usableDownloadChannelText } from '../../downloads/downloadChannelIdentity';
import { downloadManager } from '../../downloads/downloadManager';
import type { DownloadRecord } from '../../downloads/downloadTypes';
import { useDownloadsList } from '../../downloads/useDownloads';
import type { LibraryStackParamList } from '../../navigation';
import { LIBRARY_STACK_ROUTES } from '../../navigation';
import {
  LIST_ROW_ARTWORK_SIZE,
  listRowArtworkGap,
  listRowVerticalPadding,
  screenBodyInsets,
} from '../../theme/screenLayout';
import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';

type DownloadSectionKey = 'in_progress' | 'failed' | 'completed';

type DownloadSection = {
  key: DownloadSectionKey;
  title: string;
  data: DownloadRecord[];
};

const statusLabelKey = (record: DownloadRecord): string | null => {
  switch (record.status) {
    case 'complete':
      return null;
    case 'failed':
      return 'features.download.episode_download_error';
    case 'queued':
      return 'features.download.queued';
    case 'paused':
      return 'features.download.paused';
    default:
      return 'features.download.downloading_episode';
  }
};

const progressRatio = (record: DownloadRecord): number | null => {
  if (
    (record.status !== 'downloading' && record.status !== 'queued' && record.status !== 'paused') ||
    record.byteSize === null ||
    record.byteSize <= 0
  ) {
    return null;
  }
  return Math.min(1, record.bytesDownloaded / record.byteSize);
};

export function LibraryDownloadsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<LibraryStackParamList>>();
  const { styles: themeStyles, tokens } = useTheme();
  // The one screen a user opens to watch transfers, so it is the one that subscribes to byte
  // progress. Everywhere else reads statuses only.
  const { downloads, isLoading, errorKey, reload, pauseAllActive } = useDownloadsList(true);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        channelTitle: {
          ...typography.caption,
          color: themeStyles.textSecondary.color,
        },
        content: {
          ...screenBodyInsets(tokens.spacing),
          paddingBottom: tokens.spacing['2xl'],
        },
        identityRow: {
          alignItems: 'center',
          flexDirection: 'row',
          gap: listRowArtworkGap(tokens.spacing),
        },
        identityText: {
          flex: 1,
          gap: tokens.spacing.xs,
          justifyContent: 'center',
          minWidth: 0,
        },
        image: {
          height: LIST_ROW_ARTWORK_SIZE,
          width: LIST_ROW_ARTWORK_SIZE,
        },
        masterRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: tokens.spacing.sm,
          marginBottom: tokens.spacing.md,
        },
        progress: {
          marginTop: tokens.spacing.sm,
        },
        row: {
          borderBottomColor: themeStyles.border.borderColor,
          borderBottomWidth: StyleSheet.hairlineWidth,
          ...listRowVerticalPadding(tokens.spacing.base),
        },
        rowStatus: {
          ...typography.caption,
          color: themeStyles.textSecondary.color,
        },
        rowTitle: {
          ...typography.subheading,
          color: themeStyles.textPrimary.color,
        },
        screen: {
          backgroundColor: themeStyles.screen.backgroundColor,
          flex: 1,
        },
        sectionHeader: {
          ...typography.heading,
          backgroundColor: themeStyles.screen.backgroundColor,
          color: themeStyles.textPrimary.color,
          paddingBottom: tokens.spacing.sm,
          paddingTop: tokens.spacing.md,
        },
      }),
    [themeStyles, tokens]
  );

  const sections = useMemo((): DownloadSection[] => {
    const inProgress = downloads.filter(
      (row) => row.status === 'queued' || row.status === 'downloading' || row.status === 'paused'
    );
    const failed = downloads.filter((row) => row.status === 'failed');
    const completed = downloads.filter((row) => row.status === 'complete');

    const next: DownloadSection[] = [];
    if (inProgress.length > 0) {
      next.push({
        data: inProgress,
        key: 'in_progress',
        title: t('features.download.section_in_progress'),
      });
    }
    if (failed.length > 0) {
      next.push({
        data: failed,
        key: 'failed',
        title: t('features.download.section_failed'),
      });
    }
    if (completed.length > 0) {
      next.push({
        data: completed,
        key: 'completed',
        title: t('features.download.section_completed'),
      });
    }
    return next;
  }, [downloads, t]);

  const hasControllableJobs = useMemo(
    () =>
      downloads.some(
        (row) => row.status === 'queued' || row.status === 'downloading' || row.status === 'paused'
      ),
    [downloads]
  );

  const handleRowPress = useCallback(
    (record: DownloadRecord) => {
      if (record.status === 'queued' || record.status === 'downloading') {
        void downloadManager.pause(record.itemIdText);
        return;
      }
      if (record.status === 'paused') {
        void downloadManager.resume(record.itemIdText);
        return;
      }
      if (record.status === 'failed') {
        void downloadManager.retry(record.itemIdText);
        return;
      }
      if (record.status === 'complete') {
        navigation.navigate(LIBRARY_STACK_ROUTES.EpisodeDetail, {
          episodeId: record.itemIdText,
        });
      }
    },
    [navigation]
  );

  const renderRow = useCallback(
    ({ item }: { item: DownloadRecord }) => {
      const ratio = progressRatio(item);
      const statusKey = statusLabelKey(item);
      const statusText = statusKey !== null ? t(statusKey) : null;
      const accessibilityStatus = statusText ?? t('features.download.section_completed');
      const channelTitle = usableDownloadChannelText(item.channelTitle);

      return (
        <SwipeActionRow
          onRemove={() => {
            void downloadManager.remove(item.itemIdText);
          }}
          removeLabel={t('features.download.remove')}
          testID={`download-row-${item.itemIdText}`}
        >
          <Pressable
            accessibilityLabel={[
              channelTitle,
              item.title ?? item.itemIdText,
              accessibilityStatus,
            ]
              .filter((part) => part !== null && part !== undefined && part.length > 0)
              .join(', ')}
            accessibilityRole="button"
            onPress={() => {
              handleRowPress(item);
            }}
            style={styles.row}
          >
            <View style={styles.identityRow}>
              <CoverImage
                fallbackLabel={t('media.image')}
                opensViewer={false}
                style={styles.image}
                uri={item.artworkUrl}
              />
              <View style={styles.identityText}>
                {channelTitle !== null ? (
                  <Text
                    numberOfLines={1}
                    style={styles.channelTitle}
                    testID={`download-row-channel-${item.itemIdText}`}
                  >
                    {channelTitle}
                  </Text>
                ) : null}
                <Text numberOfLines={2} style={styles.rowTitle}>
                  {item.title ?? item.itemIdText}
                </Text>
                {statusText !== null ? (
                  <Text style={styles.rowStatus} testID={`download-row-status-${item.itemIdText}`}>
                    {statusText}
                  </Text>
                ) : null}
                {ratio !== null ? (
                  <ProgressTrack
                    fillTestID={`download-row-progress-${item.itemIdText}`}
                    height={3}
                    ratio={ratio}
                    style={styles.progress}
                  />
                ) : null}
              </View>
            </View>
          </Pressable>
        </SwipeActionRow>
      );
    },
    [handleRowPress, styles, t]
  );

  const listHeader = useMemo(() => {
    if (!hasControllableJobs) {
      return null;
    }
    return (
      <View style={styles.masterRow}>
        <Button
          label={
            pauseAllActive ? t('features.download.resume_all') : t('features.download.pause_all')
          }
          onPress={() => {
            if (pauseAllActive) {
              void downloadManager.resumeAll();
            } else {
              void downloadManager.pauseAll();
            }
          }}
          size="sm"
          testID="library-downloads-pause-resume-all"
          variant="secondary"
        />
      </View>
    );
  }, [hasControllableJobs, pauseAllActive, styles.masterRow, t]);

  if (isLoading) {
    return (
      <View style={styles.screen} testID="library-downloads-screen">
        <View style={styles.content}>
          <ListLoading testID="library-downloads-loading" />
        </View>
      </View>
    );
  }

  if (errorKey !== null) {
    return (
      <View style={styles.screen} testID="library-downloads-screen">
        <View style={styles.content}>
          <ListError messageKey={errorKey} onRetry={reload} testID="library-downloads-error" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen} testID="library-downloads-screen">
      <SectionList
        contentContainerStyle={styles.content}
        keyExtractor={(item) => item.itemIdText}
        ListEmptyComponent={
          <ListEmpty messageKey="features.download.empty" testID="library-downloads-empty" />
        }
        ListHeaderComponent={listHeader}
        renderItem={renderRow}
        renderSectionHeader={({ section }) => (
          <Text accessibilityRole="header" style={styles.sectionHeader}>
            {section.title}
          </Text>
        )}
        sections={sections}
        stickySectionHeadersEnabled={false}
      />
    </View>
  );
}
