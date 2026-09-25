import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import type { QueueListMedium } from '@podverse/helpers/medium';
import { DEFAULT_QUEUE_LIST_MEDIUM, getQueueMediumIdFromType } from '@podverse/helpers/medium';

import { useAuth } from '../../auth/AuthProvider';
import type { OptionChipOption } from '../../components/form/OptionChipGroup';
import { OptionChipGroup } from '../../components/form/OptionChipGroup';
import { FillList, VerticalCenter } from '../../components/primitives';
import { AuthAwareLoadState } from '../../components/state/AuthAwareLoadState';
import { ListEmpty } from '../../components/state/ListEmpty';
import { ListError } from '../../components/state/ListError';
import { LoadingSection } from '../../components/state/LoadingSection';
import { usePrimaryQueue } from '../../hooks/usePrimaryQueue';
import { useQueueDataRevision } from '../../hooks/useQueueDataRevision';
import { useQueueResources } from '../../hooks/useQueueResources';
import { resolveListFill } from '../../lib/listFill';
import type { QueueResourceHomeRow } from '../../lib/rows/homeRowMappers';
import { queueResourceToHomeRow } from '../../lib/rows/homeRowMappers';
import type { LibraryStackParamList } from '../../navigation';
import { screenBodyInsets } from '../../theme/screenLayout';
import { useTheme } from '../../theme/useTheme';
import type { HomeFeedRowData } from '../home/homeFeedData';
import { HomeFeedRow } from '../home/HomeFeedRow';
import type { QueueActionPosition } from '../home/useHomeRowPlayback';
import { useHomeRowPlayback } from '../home/useHomeRowPlayback';

type LibraryHistoryScreenProps = NativeStackScreenProps<LibraryStackParamList, 'LibraryHistory'>;

type HistoryRow = QueueResourceHomeRow;

const FIRST_PAGE = 1;

const noopPress = (): void => undefined;

const historyRowKeyExtractor = (row: HistoryRow): string => row.id;

type HistoryFeedRowProps = {
  isLast: boolean;
  onPlay: (nextRow: HomeFeedRowData, mediaType: HistoryRow['mediaType']) => void;
  onQueue: (
    nextRow: HomeFeedRowData,
    mediaType: HistoryRow['mediaType'],
    position: QueueActionPosition
  ) => void;
  row: HistoryRow;
};

function HistoryFeedRow({ isLast, onPlay, onQueue, row }: HistoryFeedRowProps) {
  const handlePlayPress = useCallback(
    (nextRow: HomeFeedRowData) => {
      onPlay(nextRow, row.mediaType);
    },
    [onPlay, row.mediaType]
  );
  const handleQueuePress = useCallback(
    (nextRow: HomeFeedRowData, position: QueueActionPosition) => {
      onQueue(nextRow, row.mediaType, position);
    },
    [onQueue, row.mediaType]
  );

  return (
    <HomeFeedRow
      isLast={isLast}
      mediaType={row.mediaType}
      onPlayPress={handlePlayPress}
      onPress={noopPress}
      onQueuePress={handleQueuePress}
      row={row}
    />
  );
}

export function LibraryHistoryScreen(_props: LibraryHistoryScreenProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { status } = useAuth();
  const { fetchActiveQueueListMedium, fetchQueueForMedium } = usePrimaryQueue();
  const { fetchHistoryPage } = useQueueResources();
  const queueDataRevision = useQueueDataRevision();
  const [selectedMedium, setSelectedMedium] = useState<QueueListMedium>(DEFAULT_QUEUE_LIST_MEDIUM);
  /** Medium whose rows are already in `historyRows`. Stays stale across a chip tap until load settles. */
  const [settledMedium, setSettledMedium] = useState<QueueListMedium | null>(null);
  const [isMediumReady, setIsMediumReady] = useState<boolean>(false);
  const [historyRows, setHistoryRows] = useState<HistoryRow[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const historyRequestIdRef = useRef(0);
  const settledMediumRef = useRef<QueueListMedium | null>(null);
  const { playbackNoticeKey, runPlayAction, runQueueAction } = useHomeRowPlayback();

  settledMediumRef.current = settledMedium;

  // Open on the account active-queue medium (even with no now-playing row); else podcasts.
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      void (async () => {
        const nextMedium = await fetchActiveQueueListMedium();
        if (!isMounted) {
          return;
        }
        setSelectedMedium((previousMedium) => {
          if (previousMedium !== nextMedium) {
            historyRequestIdRef.current += 1;
            setHistoryRows([]);
            setIsInitialLoading(true);
            setErrorKey(null);
          }
          return nextMedium;
        });
        setIsMediumReady(true);
      })();

      return () => {
        isMounted = false;
      };
    }, [fetchActiveQueueListMedium])
  );
  const styles = useMemo(() => {
    const bodyInsets = screenBodyInsets(tokens.spacing);
    return StyleSheet.create({
      container: {
        backgroundColor: themeStyles.screen.backgroundColor,
        flex: 1,
      },
      headerSection: {
        gap: tokens.spacing.base,
        paddingTop: bodyInsets.paddingTop,
      },
      listContent: {
        flexGrow: 1,
        paddingBottom: tokens.spacing['2xl'],
        paddingHorizontal: bodyInsets.paddingHorizontal,
      },
      listRule: {
        backgroundColor: themeStyles.border.borderColor,
        height: 1,
      },
      notice: {
        color: themeStyles.textSecondary.color,
        fontSize: 13,
        marginTop: tokens.spacing.sm,
        paddingHorizontal: bodyInsets.paddingHorizontal,
      },
    });
  }, [themeStyles, tokens]);

  const mediumOptions = useMemo<readonly OptionChipOption<QueueListMedium>[]>(
    () => [
      { label: t('media.podcast.podcasts'), testID: 'library-history-medium-av', value: 'av' },
      { label: t('media.music.music'), testID: 'library-history-medium-music', value: 'music' },
    ],
    [t]
  );

  const loadHistory = useCallback(async () => {
    if (!isMediumReady) {
      return;
    }

    const requestId = historyRequestIdRef.current + 1;
    historyRequestIdRef.current = requestId;
    const isCurrent = () => historyRequestIdRef.current === requestId;
    const isSoftReload = settledMediumRef.current === selectedMedium;

    if (status !== 'authenticated') {
      if (!isCurrent()) {
        return;
      }
      setHistoryRows([]);
      setErrorKey(null);
      setIsInitialLoading(false);
      setSettledMedium(selectedMedium);
      return;
    }

    if (!isSoftReload) {
      setIsInitialLoading(true);
      setErrorKey(null);
    }

    try {
      const mediumId = getQueueMediumIdFromType(selectedMedium);
      if (mediumId === null) {
        setHistoryRows([]);
        setSettledMedium(selectedMedium);
        setIsInitialLoading(false);
        return;
      }

      const selectedQueue = await fetchQueueForMedium(mediumId);
      if (!isCurrent()) {
        return;
      }
      if (selectedQueue === null) {
        setHistoryRows([]);
        setSettledMedium(selectedMedium);
        setIsInitialLoading(false);
        return;
      }

      const historyResources = await fetchHistoryPage(selectedQueue.id_text, FIRST_PAGE);
      if (!isCurrent()) {
        return;
      }

      setHistoryRows(
        historyResources.flatMap((resource) => {
          const row = queueResourceToHomeRow(resource, 'history');
          return row === null ? [] : [row];
        })
      );
      setErrorKey(null);
      setSettledMedium(selectedMedium);
    } catch {
      if (!isCurrent()) {
        return;
      }
      if (!isSoftReload) {
        setErrorKey('errors.generic');
        setHistoryRows([]);
      }
      setSettledMedium(selectedMedium);
    } finally {
      if (isCurrent()) {
        setIsInitialLoading(false);
      }
    }
  }, [fetchHistoryPage, fetchQueueForMedium, isMediumReady, selectedMedium, status]);

  // The revision counter moves when queue data changes, including a history row moved back into
  // the queue and a listen that reaches the server after the network returns. A successful queue
  // action also drops its row before that refetch, and bumps the request id so an older response
  // cannot put it back.
  useEffect(() => {
    void loadHistory();
  }, [loadHistory, queueDataRevision]);

  const handleMediumChange = useCallback(
    (nextMedium: QueueListMedium) => {
      if (nextMedium === selectedMedium) {
        return;
      }

      // Invalidate in-flight loads for the medium the user just left. Leave settledMedium stale so
      // ListEmpty cannot treat the cleared list as a settled empty for the new chip.
      historyRequestIdRef.current += 1;
      setSelectedMedium(nextMedium);
      setHistoryRows([]);
      setIsInitialLoading(true);
      setErrorKey(null);
    },
    [selectedMedium]
  );

  const handlePlayPress = useCallback(
    (nextRow: HomeFeedRowData, mediaType: HistoryRow['mediaType']) => {
      runPlayAction(nextRow, mediaType);
    },
    [runPlayAction]
  );
  const handleQueuePress = useCallback(
    (
      nextRow: HomeFeedRowData,
      mediaType: HistoryRow['mediaType'],
      position: QueueActionPosition
    ) => {
      void (async () => {
        const added = await runQueueAction(nextRow, mediaType, position);
        if (!added) {
          return;
        }
        historyRequestIdRef.current += 1;
        setHistoryRows((rows) => rows.filter((row) => row.id !== nextRow.id));
      })();
    },
    [runQueueAction]
  );
  const handleRetry = useCallback(() => {
    void loadHistory();
  }, [loadHistory]);

  const historyFill = resolveListFill({
    errorKey,
    isSettled: !isInitialLoading && settledMedium === selectedMedium,
    rowCount: historyRows.length,
  });
  const listEmpty = useMemo(() => {
    if (historyFill === 'loading') {
      return <LoadingSection testID="library-history-loading" />;
    }
    if (historyFill === 'error' && errorKey !== null) {
      return (
        <VerticalCenter>
          <ListError messageKey={errorKey} onRetry={handleRetry} testID="library-history-error" />
        </VerticalCenter>
      );
    }
    if (historyFill === 'empty') {
      return (
        <VerticalCenter>
          <ListEmpty messageKey="features.history.empty" testID="library-history-empty" />
        </VerticalCenter>
      );
    }
    return null;
  }, [errorKey, handleRetry, historyFill]);

  const listFooter = useMemo(
    () =>
      playbackNoticeKey !== null ? <Text style={styles.notice}>{t(playbackNoticeKey)}</Text> : null,
    [playbackNoticeKey, styles.notice, t]
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.headerSection}>
        <OptionChipGroup
          onChange={handleMediumChange}
          options={mediumOptions}
          testID="library-history-medium-chips"
          value={selectedMedium}
        />
        <View style={styles.listRule} />
      </View>
    ),
    [handleMediumChange, mediumOptions, selectedMedium, styles.headerSection, styles.listRule]
  );

  const historyRowCount = historyRows.length;
  const renderItem = useCallback(
    ({ index, item: row }: { index: number; item: HistoryRow }) => (
      <HistoryFeedRow
        isLast={index === historyRowCount - 1}
        onPlay={handlePlayPress}
        onQueue={handleQueuePress}
        row={row}
      />
    ),
    [handlePlayPress, handleQueuePress, historyRowCount]
  );

  const showHistoryRows = historyFill === 'ready';

  return (
    <View style={styles.container} testID="library-history-screen">
      <AuthAwareLoadState
        emptyTestID="library-history-auth-required"
        errorKey={null}
        isLoading={!isMediumReady}
        loadingTestID="library-history-loading"
        onRetry={handleRetry}
        showAuthRequired={status !== 'authenticated'}
      >
        <FillList
          ListEmptyComponent={listEmpty}
          ListFooterComponent={listFooter}
          ListHeaderComponent={listHeader}
          contentContainerStyle={styles.listContent}
          data={showHistoryRows ? historyRows : []}
          keyExtractor={historyRowKeyExtractor}
          keyboardShouldPersistTaps="handled"
          renderItem={renderItem}
          testID="library-history-list"
        />
      </AuthAwareLoadState>
    </View>
  );
}
