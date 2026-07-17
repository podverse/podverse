import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text } from 'react-native';

import type { DTOClip } from '@podverse/helpers';

import { requestWithMobileAuthRefresh } from '../../auth';
import { useAuth } from '../../auth/AuthProvider';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import { ListSection } from '../../components/section/ListSection';
import { SectionCard } from '../../components/section/SectionCard';
import { AuthAwareLoadState } from '../../components/state/AuthAwareLoadState';
import { clipToHomeRow } from '../../lib/rows/homeRowMappers';
import type { LibraryStackParamList } from '../../navigation';
import { LIBRARY_STACK_ROUTES } from '../../navigation';
import { useTheme } from '../../theme/useTheme';
import { HomeFeedRow } from '../home/HomeFeedRow';
import { useHomeRowPlaybackStub } from '../home/useHomeRowPlaybackStub';

type LibraryMyClipsScreenProps = NativeStackScreenProps<LibraryStackParamList, 'LibraryMyClips'>;

const FIRST_PAGE = 1;

export function LibraryMyClipsScreen({ navigation }: LibraryMyClipsScreenProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();
  const [clips, setClips] = useState<DTOClip[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const { playbackNoticeKey, runPlayAction, runQueueAction } = useHomeRowPlaybackStub();

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

  const loadClips = useCallback(async () => {
    if (status !== 'authenticated') {
      setClips([]);
      setErrorKey(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorKey(null);
    try {
      const response = await requestWithMobileAuthRefresh(
        {
          accessToken,
          clearSession,
          refreshToken,
          setTokens,
        },
        async (api) =>
          api.reqMyProfileClipsRecent({
            page: FIRST_PAGE,
          })
      );
      setClips(response.data);
    } catch {
      setErrorKey('errors.generic');
      setClips([]);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, clearSession, refreshToken, setTokens, status]);

  useEffect(() => {
    void loadClips();
  }, [loadClips]);

  return (
    <MobileScreenContainer heading={t('features.clip.clips')} testID="library-my-clips-screen">
      <AuthAwareLoadState
        emptyTestID={
          status !== 'authenticated' ? 'library-my-clips-auth-required' : 'library-my-clips-empty'
        }
        errorKey={errorKey}
        errorTestID="library-my-clips-error"
        isLoading={isLoading}
        loadingTestID="library-my-clips-loading"
        onRetry={() => {
          void loadClips();
        }}
        showAuthRequired={status !== 'authenticated'}
        showEmpty={status === 'authenticated' && clips.length === 0}
      >
        <SectionCard heading={t('features.clip.clips')}>
          <ListSection
            emptyTestID="library-my-clips-empty"
            items={clips}
            renderItem={(clip: DTOClip) => (
              <HomeFeedRow
                key={clip.id_text}
                mediaType="clips"
                onPlayPress={(nextRow) => {
                  runPlayAction(nextRow, 'clips');
                }}
                onPress={() => {
                  navigation.navigate(LIBRARY_STACK_ROUTES.LibraryClipDetail, {
                    clipId: clip.id_text,
                  });
                }}
                onQueuePress={(nextRow) => {
                  runQueueAction(nextRow, 'clips');
                }}
                row={clipToHomeRow(clip)}
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
