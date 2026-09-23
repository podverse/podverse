import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
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
import { useDownloadsList, useItemDownload } from '../../downloads/useDownloads';
import { useActionError } from '../../feedback/ActionErrorProvider';
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

const downloadKeyExtractor = (item: DownloadRecord): string => item.itemIdText;

type LibraryDownloadRowStyles = {
  channelTitle: TextStyle;
  identityRow: ViewStyle;
  identityText: ViewStyle;
  image: ImageStyle & ViewStyle;
  progress: ViewStyle;
  row: ViewStyle;
  rowStatus: TextStyle;
  rowTitle: TextStyle;
};

type LibraryDownloadRowProps = {
  onPress: (record: DownloadRecord) => void;
  onRemove: (itemIdText: string) => void;
  record: DownloadRecord;
  removeLabel: string;
  styles: LibraryDownloadRowStyles;
};

function LibraryDownloadRow({
  onPress,
  onRemove,
  record,
  removeLabel,
  styles,
}: LibraryDownloadRowProps) {
  const { t } = useTranslation();
  const live = useItemDownload(record.itemIdText, true);
  const current = live ?? record;
  const ratio = progressRatio(current);
  const statusKey = statusLabelKey(current);
  const statusText = statusKey !== null ? t(statusKey) : null;
  const accessibilityStatus = statusText ?? t('features.download.section_completed');
  const channelTitle = usableDownloadChannelText(current.channelTitle);
  const handlePress = useCallback(() => {
    onPress(current);
  }, [current, onPress]);
  const handleRemove = useCallback(() => {
    onRemove(record.itemIdText);
  }, [onRemove, record.itemIdText]);

  return (
    <SwipeActionRow
      onRemove={handleRemove}
      removeLabel={removeLabel}
      testID={`download-row-${record.itemIdText}`}
    >
      <Pressable
        accessibilityLabel={[channelTitle, current.title ?? current.itemIdText, accessibilityStatus]
          .filter((part) => part !== null && part !== undefined && part.length > 0)
          .join(', ')}
        accessibilityRole="button"
        onPress={handlePress}
        style={styles.row}
      >
        <View style={styles.identityRow}>
          <CoverImage opensViewer={false} style={styles.image} uri={current.artworkUrl} />
          <View style={styles.identityText}>
            {channelTitle !== null ? (
              <Text
                numberOfLines={1}
                style={styles.channelTitle}
                testID={`download-row-channel-${record.itemIdText}`}
              >
                {channelTitle}
              </Text>
            ) : null}
            <Text numberOfLines={2} style={styles.rowTitle}>
              {current.title ?? current.itemIdText}
            </Text>
            {statusText !== null ? (
              <Text style={styles.rowStatus} testID={`download-row-status-${record.itemIdText}`}>
                {statusText}
              </Text>
            ) : null}
            {ratio !== null ? (
              <ProgressTrack
                fillTestID={`download-row-progress-${record.itemIdText}`}
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
}

export function LibraryDownloadsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<LibraryStackParamList>>();
  const { styles: themeStyles, tokens } = useTheme();
  // Status changes rebuild the sections. Each in-progress row subscribes to its own bytes for the
  // bar, so a progress tick does not re-render the rest of the list.
  const { downloads, isLoading, errorKey, reload, pauseAllActive } = useDownloadsList();
  const { openDownloadError } = useActionError();

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
        openDownloadError(record.errorReason, () => {
          void downloadManager.retry(record.itemIdText);
        });
        return;
      }
      if (record.status === 'complete') {
        navigation.navigate(LIBRARY_STACK_ROUTES.EpisodeDetail, {
          episodeId: record.itemIdText,
        });
      }
    },
    [navigation, openDownloadError]
  );

  const handleRemove = useCallback((itemIdText: string) => {
    void downloadManager.remove(itemIdText);
  }, []);

  const removeLabel = t('features.download.remove');

  const downloadRowStyles = useMemo<LibraryDownloadRowStyles>(
    () => ({
      channelTitle: styles.channelTitle,
      identityRow: styles.identityRow,
      identityText: styles.identityText,
      image: styles.image,
      progress: styles.progress,
      row: styles.row,
      rowStatus: styles.rowStatus,
      rowTitle: styles.rowTitle,
    }),
    [
      styles.channelTitle,
      styles.identityRow,
      styles.identityText,
      styles.image,
      styles.progress,
      styles.row,
      styles.rowStatus,
      styles.rowTitle,
    ]
  );

  const renderRow = useCallback(
    ({ item }: { item: DownloadRecord }) => (
      <LibraryDownloadRow
        onPress={handleRowPress}
        onRemove={handleRemove}
        record={item}
        removeLabel={removeLabel}
        styles={downloadRowStyles}
      />
    ),
    [downloadRowStyles, handleRemove, handleRowPress, removeLabel]
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

  const listEmpty = useMemo(
    () => <ListEmpty messageKey="features.download.empty" testID="library-downloads-empty" />,
    []
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: DownloadSection }) => (
      <Text accessibilityRole="header" style={styles.sectionHeader}>
        {section.title}
      </Text>
    ),
    [styles.sectionHeader]
  );

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
        keyExtractor={downloadKeyExtractor}
        ListEmptyComponent={listEmpty}
        ListHeaderComponent={listHeader}
        renderItem={renderRow}
        renderSectionHeader={renderSectionHeader}
        sections={sections}
        stickySectionHeadersEnabled={false}
      />
    </View>
  );
}
