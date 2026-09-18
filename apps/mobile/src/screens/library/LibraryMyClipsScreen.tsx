import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text } from 'react-native';

import type { DTOClip } from '@podverse/helpers';
import type { DTOItem } from '@podverse/helpers';
import type { PlaybackTarget } from '@podverse/playback-core';

import { requestWithMobileAuthRefresh } from '../../auth';
import { useAuth } from '../../auth/AuthProvider';
import type { MediaRowMoreAction } from '../../components/player/MediaRowActions';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import { ListSection } from '../../components/section/ListSection';
import { SectionCard } from '../../components/section/SectionCard';
import { AuthAwareLoadState } from '../../components/state/AuthAwareLoadState';
import { clipToHomeRow } from '../../lib/rows/homeRowMappers';
import type { LibraryStackParamList } from '../../navigation';
import { LIBRARY_STACK_ROUTES } from '../../navigation';
import { navigateToMakeClipScreen } from '../../navigation';
import { usePlaybackSession } from '../../playback/PlaybackProvider';
import { useTheme } from '../../theme/useTheme';
import { HomeFeedRow } from '../home/HomeFeedRow';
import { useHomeRowPlayback } from '../home/useHomeRowPlayback';

type LibraryMyClipsScreenProps = NativeStackScreenProps<LibraryStackParamList, 'LibraryMyClips'>;

const FIRST_PAGE = 1;
const parseSeconds = (value: string): number => {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return Math.floor(parsed);
};

const itemFromTarget = (target: PlaybackTarget | null): DTOItem | null => {
  if (target === null || target.kind === 'add-by-rss') {
    return null;
  }
  return target.item;
};

export function LibraryMyClipsScreen({ navigation }: LibraryMyClipsScreenProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();
  const { activeTarget, loadItemPausedAt } = usePlaybackSession();
  const [clips, setClips] = useState<DTOClip[]>([]);
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

  useFocusEffect(
    useCallback(() => {
      void loadClips();
      return () => undefined;
    }, [loadClips])
  );

  const activeItemId = itemFromTarget(activeTarget)?.id_text ?? null;
  const prepareClipForEdit = useCallback(
    async (clip: DTOClip): Promise<void> => {
      const clipItem = clip.item;
      const clipChannel = clipItem.channel;
      if (
        clipChannel !== null &&
        clipChannel !== undefined &&
        activeItemId !== clipItem.id_text
      ) {
        await loadItemPausedAt(clipItem, clipChannel, parseSeconds(clip.start_time));
      }
    },
    [activeItemId, loadItemPausedAt]
  );

  return (
    <MobileScreenContainer
      heading={status === 'authenticated' ? t('features.clip.clips') : undefined}
      testID="library-my-clips-screen"
    >
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
            renderItem={(clip: DTOClip, _index, isLast) => (
              <HomeFeedRow
                extraMoreActions={[
                  {
                    key: `edit-${clip.id_text}`,
                    label: t('features.clip.edit_clip'),
                    onPress: () => {
                      void (async () => {
                        await prepareClipForEdit(clip);
                        navigateToMakeClipScreen({ mode: 'edit', clipId: clip.id_text });
                      })();
                    },
                    testID: `library-my-clips-edit-${clip.id_text}`,
                  } satisfies MediaRowMoreAction,
                ]}
                isLast={isLast}
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
                onQueuePress={(nextRow, position) => {
                  runQueueAction(nextRow, 'clips', position);
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
