import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';

import type { DTOItem } from '@podverse/helpers/dto';

import { Button } from '../../components/primitives/Button';
import { CoverImage } from '../../components/primitives/CoverImage';
import { ProgressTrack } from '../../components/primitives/ProgressTrack';
import { SwipeActionRow } from '../../components/primitives/SwipeActionRow';
import { SectionHeading } from '../../components/section/SectionHeading';
import { ListEmpty } from '../../components/state/ListEmpty';
import { ListError } from '../../components/state/ListError';
import { ListLoading } from '../../components/state/ListLoading';
import { playableItemRepository } from '../../data/repositories/playableItemRepository';
import { downloadManager } from '../../downloads/downloadManager';
import type { DownloadRowIdentity } from '../../downloads/downloadRowIdentity';
import { downloadRowIdentity } from '../../downloads/downloadRowIdentity';
import type { DownloadRecord } from '../../downloads/downloadTypes';
import { formatDownloadByteProgress } from '../../downloads/formatDownloadByteProgress';
import { useDownloadsList, useItemDownload } from '../../downloads/useDownloads';
import { useActionError } from '../../feedback/ActionErrorProvider';
import type { LibraryStackParamList } from '../../navigation';
import { LIBRARY_STACK_ROUTES } from '../../navigation';
import {
  BottomChromeScrollSpacer,
  useBottomChromeScrollIndicatorInsets,
} from '../../theme/bottomChromeOverlayInset';
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

/** Title line box. Matches `HomeFeedRow` item titles so Downloads sits on the same ramp. */
const TITLE_LINE_HEIGHT = 26;

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

const isInProgressDownload = (record: DownloadRecord): boolean =>
  record.status === 'queued' || record.status === 'downloading' || record.status === 'paused';

const progressRatio = (record: DownloadRecord): number | null => {
  if (!isInProgressDownload(record) || record.byteSize === null || record.byteSize <= 0) {
    return null;
  }
  return Math.min(1, record.bytesDownloaded / record.byteSize);
};

type LibraryDownloadProgressTrackProps = {
  itemIdText: string;
  record: DownloadRecord;
  style: ViewStyle;
};

/**
 * Byte progress for one download row. The subscription lives here so a progress tick repaints the
 * track and does not re-render the swipeable.
 */
function LibraryDownloadProgressTrack({
  itemIdText,
  record,
  style,
}: LibraryDownloadProgressTrackProps) {
  const live = useItemDownload(itemIdText, true);
  const ratio = progressRatio(live ?? record);
  if (ratio === null) {
    return null;
  }
  return (
    <ProgressTrack
      fillTestID={`download-row-progress-${itemIdText}`}
      height={3}
      ratio={ratio}
      style={style}
    />
  );
}

type LibraryDownloadStatusLineProps = {
  itemIdText: string;
  record: DownloadRecord;
  statusText: string;
  style: TextStyle;
};

/**
 * Status words for one download row. While downloading, the progress subscription appends
 * transferred size on the same cadence as the progress track.
 */
function LibraryDownloadStatusLine({
  itemIdText,
  record,
  statusText,
  style,
}: LibraryDownloadStatusLineProps) {
  const live = useItemDownload(itemIdText, record.status === 'downloading');
  const progressRecord = live ?? record;
  const byteProgress =
    progressRecord.status === 'downloading'
      ? formatDownloadByteProgress(progressRecord.bytesDownloaded, progressRecord.byteSize)
      : null;
  const label = byteProgress !== null ? `${statusText} ${byteProgress}` : statusText;

  return (
    <Text numberOfLines={1} style={style} testID={`download-row-status-${itemIdText}`}>
      {label}
    </Text>
  );
}

const downloadKeyExtractor = (item: DownloadRecord): string => item.itemIdText;

type LibraryDownloadRowStyles = {
  contextTitle: TextStyle;
  dateLabel: TextStyle;
  identityRow: ViewStyle;
  identityText: ViewStyle;
  image: ImageStyle & ViewStyle;
  progress: ViewStyle;
  row: ViewStyle;
  rowStatus: TextStyle;
  rowTitle: TextStyle;
  secondaryTitle: TextStyle;
};

type LibraryDownloadRowProps = {
  identity: DownloadRowIdentity;
  onPress: (record: DownloadRecord) => void;
  onRemove: (itemIdText: string) => void;
  record: DownloadRecord;
  removeLabel: string;
  styles: LibraryDownloadRowStyles;
};

const LibraryDownloadRow = memo(function LibraryDownloadRow({
  identity,
  onPress,
  onRemove,
  record,
  removeLabel,
  styles,
}: LibraryDownloadRowProps) {
  const { t } = useTranslation();
  const statusKey = statusLabelKey(record);
  const statusText = statusKey !== null ? t(statusKey) : null;
  const accessibilityStatus = statusText ?? t('features.download.section_completed');
  const handlePress = useCallback(() => {
    onPress(record);
  }, [onPress, record]);
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
        accessibilityLabel={[...identity.accessibilityParts, accessibilityStatus]
          .filter((part) => part.length > 0)
          .join(', ')}
        accessibilityRole="button"
        onPress={handlePress}
        style={styles.row}
      >
        <View style={styles.identityRow}>
          <CoverImage opensViewer={false} style={styles.image} uri={record.artworkUrl} />
          <View style={styles.identityText}>
            {identity.contextTitle !== null ? (
              <Text
                numberOfLines={1}
                style={styles.contextTitle}
                testID={`download-row-channel-${record.itemIdText}`}
              >
                {identity.contextTitle}
              </Text>
            ) : null}
            <Text numberOfLines={2} style={styles.rowTitle}>
              {identity.title}
            </Text>
            {identity.dateLabel !== null ? (
              <Text
                numberOfLines={1}
                style={styles.dateLabel}
                testID={`download-row-date-${record.itemIdText}`}
              >
                {identity.dateLabel}
              </Text>
            ) : null}
            {identity.secondaryTitle !== null ? (
              <Text
                numberOfLines={1}
                style={styles.secondaryTitle}
                testID={`download-row-artist-${record.itemIdText}`}
              >
                {identity.secondaryTitle}
              </Text>
            ) : null}
            {statusText !== null ? (
              <LibraryDownloadStatusLine
                itemIdText={record.itemIdText}
                record={record}
                statusText={statusText}
                style={styles.rowStatus}
              />
            ) : null}
            {isInProgressDownload(record) ? (
              <LibraryDownloadProgressTrack
                itemIdText={record.itemIdText}
                record={record}
                style={styles.progress}
              />
            ) : null}
          </View>
        </View>
      </Pressable>
    </SwipeActionRow>
  );
});

export function LibraryDownloadsScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<LibraryStackParamList>>();
  const { styles: themeStyles, tokens } = useTheme();
  const scrollIndicatorInsets = useBottomChromeScrollIndicatorInsets();
  // Status changes rebuild the sections. Byte progress stays inside each in-progress row's track.
  const { downloads, isLoading, errorKey, reload, pauseAllActive } = useDownloadsList();
  const { openDownloadError } = useActionError();
  const [downloadItemsById, setDownloadItemsById] = useState<ReadonlyMap<string, DTOItem>>(
    () => new Map()
  );

  useEffect(() => {
    let cancelled = false;
    void playableItemRepository.listBySource('download').then((items) => {
      if (cancelled) {
        return;
      }
      const next = new Map<string, DTOItem>();
      for (const item of items) {
        next.set(item.id_text, item);
      }
      setDownloadItemsById(next);
    });
    return () => {
      cancelled = true;
    };
  }, [downloads]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        content: {
          ...screenBodyInsets(tokens.spacing),
          paddingBottom: tokens.spacing['2xl'],
        },
        contextTitle: {
          ...typography.body,
          color: themeStyles.textPrimary.color,
        },
        dateLabel: {
          color: tokens.text.link,
          fontSize: 14,
          fontWeight: '700',
          lineHeight: 20,
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
          borderTopColor: themeStyles.border.borderColor,
          borderTopWidth: StyleSheet.hairlineWidth,
          // The progress track is clipped to this sliding row, so it cannot paint into Remove.
          overflow: 'hidden',
          ...listRowVerticalPadding(tokens.spacing.base),
        },
        rowStatus: {
          ...typography.caption,
          color: themeStyles.textSecondary.color,
        },
        rowTitle: {
          ...typography.subheading,
          color: themeStyles.textPrimary.color,
          fontSize: 19,
          fontWeight: '400',
          lineHeight: TITLE_LINE_HEIGHT,
        },
        screen: {
          backgroundColor: themeStyles.screen.backgroundColor,
          flex: 1,
        },
        secondaryTitle: {
          color: themeStyles.textSecondary.color,
          fontSize: 14,
          fontWeight: '400',
          lineHeight: 20,
        },
        sectionHeader: {
          backgroundColor: themeStyles.screen.backgroundColor,
          paddingBottom: tokens.spacing.sm,
          paddingTop: tokens.spacing.md,
        },
      }),
    [themeStyles, tokens]
  );

  const sections = useMemo((): DownloadSection[] => {
    const inProgress = downloads.filter(isInProgressDownload);
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

  const hasControllableJobs = useMemo(() => downloads.some(isInProgressDownload), [downloads]);

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
      contextTitle: styles.contextTitle,
      dateLabel: styles.dateLabel,
      identityRow: styles.identityRow,
      identityText: styles.identityText,
      image: styles.image,
      progress: styles.progress,
      row: styles.row,
      rowStatus: styles.rowStatus,
      rowTitle: styles.rowTitle,
      secondaryTitle: styles.secondaryTitle,
    }),
    [
      styles.contextTitle,
      styles.dateLabel,
      styles.identityRow,
      styles.identityText,
      styles.image,
      styles.progress,
      styles.row,
      styles.rowStatus,
      styles.rowTitle,
      styles.secondaryTitle,
    ]
  );

  const renderRow = useCallback(
    ({ item }: { item: DownloadRecord }) => (
      <LibraryDownloadRow
        identity={downloadRowIdentity(
          item,
          downloadItemsById.get(item.itemIdText) ?? null,
          i18n.language
        )}
        onPress={handleRowPress}
        onRemove={handleRemove}
        record={item}
        removeLabel={removeLabel}
        styles={downloadRowStyles}
      />
    ),
    [downloadItemsById, downloadRowStyles, handleRemove, handleRowPress, i18n.language, removeLabel]
  );

  const listHeader = useMemo(() => {
    if (!hasControllableJobs) {
      return undefined;
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
      <SectionHeading style={styles.sectionHeader}>{section.title}</SectionHeading>
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
        ListFooterComponent={<BottomChromeScrollSpacer />}
        ListHeaderComponent={listHeader}
        scrollIndicatorInsets={scrollIndicatorInsets}
        renderItem={renderRow}
        renderSectionHeader={renderSectionHeader}
        sections={sections}
        stickySectionHeadersEnabled={false}
      />
    </View>
  );
}
