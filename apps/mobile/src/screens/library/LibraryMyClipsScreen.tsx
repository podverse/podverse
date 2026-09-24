import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import type { DTOClip, DTOItem } from '@podverse/helpers';
import type { PlaybackTarget } from '@podverse/playback-core';

import { requestWithMobileAuthRefresh } from '../../auth';
import { useAuth } from '../../auth/AuthProvider';
import type { MediaRowMoreAction } from '../../components/player/MediaRowActions';
import { FillList } from '../../components/primitives';
import { SectionHeading } from '../../components/section/SectionHeading';
import { AuthAwareLoadState } from '../../components/state/AuthAwareLoadState';
import { ListEmpty } from '../../components/state/ListEmpty';
import { clipToHomeRow, MIXED_SOURCE_CLIP_ROW_OPTIONS } from '../../lib/rows/homeRowMappers';
import type { LibraryStackParamList } from '../../navigation';
import { LIBRARY_STACK_ROUTES, navigateToMakeClipScreen } from '../../navigation';
import { usePlaybackSession } from '../../playback/PlaybackProvider';
import { screenBodyInsets } from '../../theme/screenLayout';
import { useTheme } from '../../theme/useTheme';
import type { HomeFeedRowData } from '../home/homeFeedData';
import { HomeFeedRow } from '../home/HomeFeedRow';
import type { QueueActionPosition } from '../home/useHomeRowPlayback';
import { useHomeRowPlayback } from '../home/useHomeRowPlayback';

type LibraryMyClipsScreenProps = NativeStackScreenProps<LibraryStackParamList, 'LibraryMyClips'>;

type LibraryMyClipRowProps = {
  clip: DTOClip;
  isLast: boolean;
  onPlayPress: (row: HomeFeedRowData) => void;
  onPress: (clip: DTOClip) => void;
  onQueuePress: (row: HomeFeedRowData, position: QueueActionPosition) => void;
  prepareClipForEdit: (clip: DTOClip) => Promise<void>;
};

const LibraryMyClipRow = memo(function LibraryMyClipRow({
  clip,
  isLast,
  onPlayPress,
  onPress,
  onQueuePress,
  prepareClipForEdit,
}: LibraryMyClipRowProps) {
  const { t } = useTranslation();
  const extraMoreActions = useMemo<MediaRowMoreAction[]>(
    () => [
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
      },
    ],
    [clip, prepareClipForEdit, t]
  );
  const row = useMemo(() => clipToHomeRow(clip, MIXED_SOURCE_CLIP_ROW_OPTIONS), [clip]);

  return (
    <HomeFeedRow
      extraMoreActions={extraMoreActions}
      isLast={isLast}
      mediaType="clips"
      onPlayPress={onPlayPress}
      onPress={() => {
        onPress(clip);
      }}
      onQueuePress={onQueuePress}
      row={row}
    />
  );
});

const FIRST_PAGE = 1;
const myClipKeyExtractor = (clip: DTOClip): string => clip.id_text;
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
        list: {
          backgroundColor: tokens.background.secondary,
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.md,
          borderWidth: 1,
          flex: 1,
          marginTop: tokens.spacing.md,
        },
        listContent: {
          padding: tokens.spacing.lg,
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
        screenHeading: {
          color: themeStyles.textPrimary.color,
          fontSize: 28,
          fontWeight: '700',
          marginBottom: tokens.spacing.lg,
        },
        sectionHeading: {
          marginBottom: tokens.spacing.sm,
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

  const handlePlayPress = useCallback(
    (nextRow: HomeFeedRowData) => {
      runPlayAction(nextRow, 'clips');
    },
    [runPlayAction]
  );
  const handleQueuePress = useCallback(
    (nextRow: HomeFeedRowData, position: QueueActionPosition) => {
      runQueueAction(nextRow, 'clips', position);
    },
    [runQueueAction]
  );
  const handleClipPress = useCallback(
    (clip: DTOClip) => {
      navigation.navigate(LIBRARY_STACK_ROUTES.LibraryClipDetail, {
        clipId: clip.id_text,
      });
    },
    [navigation]
  );
  const handleRetry = useCallback(() => {
    void loadClips();
  }, [loadClips]);

  const activeItemId = itemFromTarget(activeTarget)?.id_text ?? null;
  const prepareClipForEdit = useCallback(
    async (clip: DTOClip): Promise<void> => {
      const clipItem = clip.item;
      const clipChannel = clipItem.channel;
      if (clipChannel !== null && clipChannel !== undefined && activeItemId !== clipItem.id_text) {
        await loadItemPausedAt(clipItem, clipChannel, parseSeconds(clip.start_time));
      }
    },
    [activeItemId, loadItemPausedAt]
  );

  const listHeader = useMemo(
    () => (
      <>
        <Text accessibilityRole="header" style={styles.screenHeading}>
          {t('features.clip.clips')}
        </Text>
        <SectionHeading style={styles.sectionHeading}>{t('features.clip.clips')}</SectionHeading>
      </>
    ),
    [styles.screenHeading, styles.sectionHeading, t]
  );
  const listEmpty = useMemo(
    () => <ListEmpty messageKey="features.clip.empty" testID="library-my-clips-empty" />,
    []
  );
  const listFooter = useMemo(
    () =>
      playbackNoticeKey !== null ? <Text style={styles.notice}>{t(playbackNoticeKey)}</Text> : null,
    [playbackNoticeKey, styles.notice, t]
  );

  const clipCount = clips.length;
  const renderItem = useCallback(
    ({ index, item: clip }: { index: number; item: DTOClip }) => (
      <LibraryMyClipRow
        clip={clip}
        isLast={index === clipCount - 1}
        onPlayPress={handlePlayPress}
        onPress={handleClipPress}
        onQueuePress={handleQueuePress}
        prepareClipForEdit={prepareClipForEdit}
      />
    ),
    [clipCount, handleClipPress, handlePlayPress, handleQueuePress, prepareClipForEdit]
  );

  const showList = status === 'authenticated' && !isLoading && errorKey === null;

  return (
    <View style={styles.screen} testID="library-my-clips-screen">
      {showList ? (
        <FillList
          ListEmptyComponent={listEmpty}
          ListFooterComponent={listFooter}
          ListHeaderComponent={listHeader}
          contentContainerStyle={styles.listContent}
          data={clips}
          keyExtractor={myClipKeyExtractor}
          keyboardShouldPersistTaps="handled"
          renderItem={renderItem}
          style={styles.list}
        />
      ) : (
        <AuthAwareLoadState
          emptyTestID={
            status !== 'authenticated' ? 'library-my-clips-auth-required' : 'library-my-clips-empty'
          }
          errorKey={errorKey}
          errorTestID="library-my-clips-error"
          isLoading={isLoading}
          loadingTestID="library-my-clips-loading"
          onRetry={handleRetry}
          showAuthRequired={status !== 'authenticated'}
        />
      )}
    </View>
  );
}
