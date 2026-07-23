import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DTOQueue } from '@podverse/helpers';

import { useAuth } from '../../auth/AuthProvider';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import { ListSection } from '../../components/section/ListSection';
import { SectionCard } from '../../components/section/SectionCard';
import { AuthAwareLoadState } from '../../components/state/AuthAwareLoadState';
import { usePrimaryQueue } from '../../hooks/usePrimaryQueue';
import { useQueueResources } from '../../hooks/useQueueResources';
import type { QueueResourceHomeRow } from '../../lib/rows/homeRowMappers';
import { queueResourceToHomeRow } from '../../lib/rows/homeRowMappers';
import type { LibraryStackParamList } from '../../navigation';
import { useTheme } from '../../theme/useTheme';
import { HomeFeedRow } from '../home/HomeFeedRow';
import { useHomeRowPlayback } from '../home/useHomeRowPlayback';

type LibraryQueueScreenProps = NativeStackScreenProps<LibraryStackParamList, 'LibraryQueue'>;

type QueueRow = QueueResourceHomeRow;

export function LibraryQueueScreen(_props: LibraryQueueScreenProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { status } = useAuth();
  const { fetchPrimaryQueue } = usePrimaryQueue();
  const { fetchNowPlaying, fetchUpcoming } = useQueueResources();
  const [queue, setQueue] = useState<DTOQueue | null>(null);
  const [nowPlayingRow, setNowPlayingRow] = useState<QueueRow | null>(null);
  const [upcomingRows, setUpcomingRows] = useState<QueueRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [queueNoticeKey, setQueueNoticeKey] = useState<string | null>(null);
  const { playbackNoticeKey, runPlayAction, runQueueAction } = useHomeRowPlayback();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        actionButton: {
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.round,
          borderWidth: 1,
          marginLeft: tokens.spacing.sm,
          paddingHorizontal: tokens.spacing.sm,
          paddingVertical: tokens.spacing.xs,
        },
        actionButtonLabel: {
          color: themeStyles.textPrimary.color,
          fontSize: 12,
          fontWeight: '600',
        },
        actionRow: {
          flexDirection: 'row',
          justifyContent: 'flex-end',
          marginBottom: tokens.spacing.sm,
        },
        notice: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          marginTop: tokens.spacing.sm,
        },
      }),
    [themeStyles, tokens]
  );

  const loadQueue = useCallback(async () => {
    if (status !== 'authenticated') {
      setQueue(null);
      setNowPlayingRow(null);
      setUpcomingRows([]);
      setErrorKey(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorKey(null);
    try {
      const selectedQueue = await fetchPrimaryQueue();
      if (selectedQueue === null) {
        setQueue(null);
        setNowPlayingRow(null);
        setUpcomingRows([]);
        setIsLoading(false);
        return;
      }

      setQueue(selectedQueue);

      const [nowPlaying, upcoming] = await Promise.all([
        fetchNowPlaying(selectedQueue.id_text),
        fetchUpcoming(selectedQueue.id_text),
      ]);

      setNowPlayingRow(nowPlaying ? queueResourceToHomeRow(nowPlaying, 'queue') : null);
      setUpcomingRows(
        upcoming.flatMap((resource) => {
          const row = queueResourceToHomeRow(resource, 'queue');
          return row === null ? [] : [row];
        })
      );
    } catch {
      setErrorKey('errors.generic');
      setQueue(null);
      setNowPlayingRow(null);
      setUpcomingRows([]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchNowPlaying, fetchPrimaryQueue, fetchUpcoming, status]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const handleQueueUiAction = (type: 'remove' | 'reorder') => {
    setQueueNoticeKey(type === 'remove' ? 'features.queue.remove_from_queue' : 'settings.settings');
  };

  return (
    <MobileScreenContainer heading={t('features.queue.queue')} testID="library-queue-screen">
      <AuthAwareLoadState
        emptyTestID={
          status !== 'authenticated' ? 'library-queue-auth-required' : 'library-queue-empty'
        }
        errorKey={errorKey}
        errorTestID="library-queue-error"
        isLoading={isLoading}
        loadingTestID="library-queue-loading"
        onRetry={() => {
          void loadQueue();
        }}
        showAuthRequired={status !== 'authenticated'}
        showEmpty={status === 'authenticated' && queue === null}
      >
        <>
          <SectionCard heading={t('features.queue.queue')}>
            {queue !== null ? (
              <>
                <Text style={styles.notice}>{queue.id_text}</Text>
                {nowPlayingRow !== null ? (
                  <HomeFeedRow
                    mediaType={nowPlayingRow.mediaType}
                    onPlayPress={(row) => {
                      runPlayAction(row, nowPlayingRow.mediaType);
                    }}
                    onPress={() => {}}
                    onQueuePress={(row, position) => {
                      runQueueAction(row, nowPlayingRow.mediaType, position);
                    }}
                    row={nowPlayingRow}
                  />
                ) : null}
              </>
            ) : null}
          </SectionCard>

          <SectionCard heading={t('features.queue.queue_next')}>
            <ListSection
              emptyTestID="library-queue-upcoming-empty"
              items={upcomingRows}
              renderItem={(row: QueueRow) => (
                <View key={row.id}>
                  <View style={styles.actionRow}>
                    <Pressable
                      onPress={() => {
                        handleQueueUiAction('reorder');
                      }}
                      style={styles.actionButton}
                      testID={`library-queue-reorder-${row.queueResourceId}`}
                    >
                      <Text style={styles.actionButtonLabel}>{t('settings.settings')}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        handleQueueUiAction('remove');
                      }}
                      style={styles.actionButton}
                      testID={`library-queue-remove-${row.queueResourceId}`}
                    >
                      <Text style={styles.actionButtonLabel}>
                        {t('features.queue.remove_from_queue')}
                      </Text>
                    </Pressable>
                  </View>
                  <HomeFeedRow
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
                </View>
              )}
            />
            {playbackNoticeKey !== null ? (
              <Text style={styles.notice}>{t(playbackNoticeKey)}</Text>
            ) : null}
            {queueNoticeKey !== null ? (
              <Text style={styles.notice}>{t(queueNoticeKey)}</Text>
            ) : null}
          </SectionCard>
        </>
      </AuthAwareLoadState>
    </MobileScreenContainer>
  );
}
