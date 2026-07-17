import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../../auth/AuthProvider';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import { ListSection } from '../../components/section/ListSection';
import { SectionCard } from '../../components/section/SectionCard';
import { AuthAwareLoadState } from '../../components/state/AuthAwareLoadState';
import { usePrimaryQueue } from '../../hooks/usePrimaryQueue';
import { useQueueResources } from '../../hooks/useQueueResources';
import { queueResourceToHomeRow } from '../../lib/rows/homeRowMappers';
import type { LibraryStackParamList } from '../../navigation';
import { useTheme } from '../../theme/useTheme';
import { HomeFeedRow } from '../home/HomeFeedRow';
import { useHomeRowPlaybackStub } from '../home/useHomeRowPlaybackStub';

type LibraryHistoryScreenProps = NativeStackScreenProps<LibraryStackParamList, 'LibraryHistory'>;

type HistoryRow = ReturnType<typeof queueResourceToHomeRow>;

const FIRST_PAGE = 1;

export function LibraryHistoryScreen(_props: LibraryHistoryScreenProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { status } = useAuth();
  const { fetchPrimaryQueue } = usePrimaryQueue();
  const { fetchHistoryPage } = useQueueResources();
  const [historyRows, setHistoryRows] = useState<HistoryRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [resumeNoticeKey, setResumeNoticeKey] = useState<string | null>(null);
  const { playbackNoticeKey, runPlayAction, runQueueAction } = useHomeRowPlaybackStub();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        notice: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          marginTop: tokens.spacing.sm,
        },
        resumeButton: {
          alignSelf: 'flex-end',
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.full,
          borderWidth: 1,
          marginBottom: tokens.spacing.sm,
          paddingHorizontal: tokens.spacing.sm,
          paddingVertical: tokens.spacing.xs,
        },
        resumeButtonLabel: {
          color: themeStyles.textPrimary.color,
          fontSize: 12,
          fontWeight: '600',
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
        historyResources.map((resource) => queueResourceToHomeRow(resource, 'history'))
      );
    } catch {
      setErrorKey('errors.generic');
      setHistoryRows([]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchHistoryPage, fetchPrimaryQueue, status]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  return (
    <MobileScreenContainer heading={t('features.history.history')} testID="library-history-screen">
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
            renderItem={(row: HistoryRow) => (
              <View key={row.id}>
                <Pressable
                  onPress={() => {
                    setResumeNoticeKey('media_player.play');
                  }}
                  style={styles.resumeButton}
                  testID={`library-history-resume-${row.queueResourceId}`}
                >
                  <Text style={styles.resumeButtonLabel}>{t('media_player.play')}</Text>
                </Pressable>
                <HomeFeedRow
                  mediaType={row.mediaType}
                  onPlayPress={(nextRow) => {
                    runPlayAction(nextRow, row.mediaType);
                  }}
                  onPress={() => {}}
                  onQueuePress={(nextRow) => {
                    runQueueAction(nextRow, row.mediaType);
                  }}
                  row={row}
                />
              </View>
            )}
          />
          {playbackNoticeKey !== null ? (
            <Text style={styles.notice}>{t(playbackNoticeKey)}</Text>
          ) : null}
          {resumeNoticeKey !== null ? (
            <Text style={styles.notice}>{t(resumeNoticeKey)}</Text>
          ) : null}
        </SectionCard>
      </AuthAwareLoadState>
    </MobileScreenContainer>
  );
}
