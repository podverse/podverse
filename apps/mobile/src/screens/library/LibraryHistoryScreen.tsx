import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text } from 'react-native';

import { useAuth } from '../../auth/AuthProvider';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import { ListSection } from '../../components/section/ListSection';
import { SectionCard } from '../../components/section/SectionCard';
import { AuthAwareLoadState } from '../../components/state/AuthAwareLoadState';
import { usePrimaryQueue } from '../../hooks/usePrimaryQueue';
import { useQueueDataRevision } from '../../hooks/useQueueDataRevision';
import { useQueueResources } from '../../hooks/useQueueResources';
import type { QueueResourceHomeRow } from '../../lib/rows/homeRowMappers';
import { queueResourceToHomeRow } from '../../lib/rows/homeRowMappers';
import type { LibraryStackParamList } from '../../navigation';
import { useTheme } from '../../theme/useTheme';
import { HomeFeedRow } from '../home/HomeFeedRow';
import { useHomeRowPlayback } from '../home/useHomeRowPlayback';

type LibraryHistoryScreenProps = NativeStackScreenProps<LibraryStackParamList, 'LibraryHistory'>;

type HistoryRow = QueueResourceHomeRow;

const FIRST_PAGE = 1;

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
        notice: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          marginTop: tokens.spacing.sm,
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

  return (
    <MobileScreenContainer
      heading={status === 'authenticated' ? t('features.history.history') : undefined}
      testID="library-history-screen"
    >
      <AuthAwareLoadState
        emptyTestID={
          status !== 'authenticated' ? 'library-history-auth-required' : 'library-history-empty'
        }
        errorKey={errorKey}
        errorTestID="library-history-error"
        isLoading={isLoading}
        loadingTestID="library-history-loading"
        onRetry={() => {
          void loadHistory();
        }}
        showAuthRequired={status !== 'authenticated'}
        showEmpty={status === 'authenticated' && historyRows.length === 0}
      >
        <SectionCard heading={t('features.history.history')}>
          <ListSection
            emptyTestID="library-history-empty"
            items={historyRows}
            renderItem={(row: HistoryRow, _index, isLast) => (
              <HomeFeedRow
                isLast={isLast}
                key={row.id}
                mediaType={row.mediaType}
                onPlayPress={(nextRow) => {
                  runPlayAction(nextRow, row.mediaType);
                }}
                onPress={() => {}}
                onQueuePress={(nextRow, position) => {
                  runQueueAction(nextRow, row.mediaType, position);
                }}
                row={row}
              />
            )}
          />
          {playbackNoticeKey !== null ? (
            <Text style={styles.notice}>{t(playbackNoticeKey)}</Text>
          ) : null}
        </SectionCard>
      </AuthAwareLoadState>
    </MobileScreenContainer>
  );
}
