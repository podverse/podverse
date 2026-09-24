import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../../auth/AuthProvider';
import { FillList } from '../../components/primitives';
import { AuthAwareLoadState } from '../../components/state/AuthAwareLoadState';
import { ListEmpty } from '../../components/state/ListEmpty';
import { usePrimaryQueue } from '../../hooks/usePrimaryQueue';
import { useQueueDataRevision } from '../../hooks/useQueueDataRevision';
import { useQueueResources } from '../../hooks/useQueueResources';
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
  const { fetchPrimaryQueue } = usePrimaryQueue();
  const { fetchHistoryPage } = useQueueResources();
  const queueDataRevision = useQueueDataRevision();
  const [historyRows, setHistoryRows] = useState<HistoryRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const { playbackNoticeKey, runPlayAction, runQueueAction } = useHomeRowPlayback();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        list: {
          backgroundColor: themeStyles.screen.backgroundColor,
          flex: 1,
        },
        notice: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          marginTop: tokens.spacing.sm,
        },
        screen: {
          backgroundColor: themeStyles.screen.backgroundColor,
          flex: 1,
          paddingBottom: tokens.spacing['2xl'],
          ...screenBodyInsets(tokens.spacing),
        },
      }),
    [themeStyles, tokens]
  );

  const loadHistory = useCallback(async () => {
    if (status !== 'authenticated') {
      setHistoryRows([]);
      setErrorKey(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorKey(null);
    try {
      const selectedQueue = await fetchPrimaryQueue();
      if (selectedQueue === null) {
        setHistoryRows([]);
        setIsLoading(false);
        return;
      }

      const historyResources = await fetchHistoryPage(selectedQueue.id_text, FIRST_PAGE);

      setHistoryRows(
        historyResources.flatMap((resource) => {
          const row = queueResourceToHomeRow(resource, 'history');
          return row === null ? [] : [row];
        })
      );
    } catch {
      setErrorKey('errors.generic');
      setHistoryRows([]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchHistoryPage, fetchPrimaryQueue, status]);

  // Reloading on the revision as well as on mount is what lets a listen recorded offline appear
  // here: it reaches the server through the reconcile that runs after the network comes back, which
  // can land while this screen is already open.
  useEffect(() => {
    void loadHistory();
  }, [loadHistory, queueDataRevision]);

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
      runQueueAction(nextRow, mediaType, position);
    },
    [runQueueAction]
  );
  const handleRetry = useCallback(() => {
    void loadHistory();
  }, [loadHistory]);

  const listEmpty = useMemo(() => <ListEmpty testID="library-history-empty" />, []);
  const listFooter = useMemo(
    () =>
      playbackNoticeKey !== null ? <Text style={styles.notice}>{t(playbackNoticeKey)}</Text> : null,
    [playbackNoticeKey, styles.notice, t]
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

  const showList = status === 'authenticated' && !isLoading && errorKey === null;

  return (
    <View style={styles.screen} testID="library-history-screen">
      {showList ? (
        <FillList
          ListEmptyComponent={listEmpty}
          ListFooterComponent={listFooter}
          data={historyRows}
          keyExtractor={historyRowKeyExtractor}
          keyboardShouldPersistTaps="handled"
          renderItem={renderItem}
          style={styles.list}
        />
      ) : (
        <AuthAwareLoadState
          emptyTestID={
            status !== 'authenticated' ? 'library-history-auth-required' : 'library-history-empty'
          }
          errorKey={errorKey}
          errorTestID="library-history-error"
          isLoading={isLoading}
          loadingTestID="library-history-loading"
          onRetry={handleRetry}
          showAuthRequired={status !== 'authenticated'}
        />
      )}
    </View>
  );
}
