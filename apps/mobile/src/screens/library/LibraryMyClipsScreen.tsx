import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import type { DTOClip, DTOItem } from '@podverse/helpers';
import type { PlaybackTarget } from '@podverse/playback-core';

import { requestWithMobileAuthRefresh } from '../../auth';
import { useAuth } from '../../auth/AuthProvider';
import type { MediaRowMoreAction } from '../../components/player/MediaRowActions';
import { FillList } from '../../components/primitives';
import { AuthAwareLoadState } from '../../components/state/AuthAwareLoadState';
import { ListEmpty } from '../../components/state/ListEmpty';
import { ListError } from '../../components/state/ListError';
import { ListLoading } from '../../components/state/ListLoading';
import { useLoadMoreOnEndReached } from '../../hooks/useLoadMoreOnEndReached';
import {
  appendUniqueBy,
  canLoadNextPage,
  LIST_END_REACHED_THRESHOLD,
  listResponseHasMore,
} from '../../lib/pagination/pagedList';
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
  onPlayPress: (row: HomeFeedRowData) => void;
  onPress: (clip: DTOClip) => void;
  onQueuePress: (row: HomeFeedRowData, position: QueueActionPosition) => void;
  prepareClipForEdit: (clip: DTOClip) => Promise<void>;
};

const LibraryMyClipRow = memo(function LibraryMyClipRow({
  clip,
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
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [loadMoreErrorKey, setLoadMoreErrorKey] = useState<string | null>(null);
  const pageRef = useRef<number>(FIRST_PAGE);
  const generationRef = useRef<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const { playbackNoticeKey, runPlayAction, runQueueAction } = useHomeRowPlayback();

  const styles = useMemo(() => {
    const bodyInsets = screenBodyInsets(tokens.spacing);
    return StyleSheet.create({
      container: {
        backgroundColor: themeStyles.screen.backgroundColor,
        flex: 1,
      },
      listContent: {
        flexGrow: 1,
        paddingBottom: tokens.spacing['2xl'],
        paddingHorizontal: bodyInsets.paddingHorizontal,
        paddingTop: bodyInsets.paddingTop,
      },
      notice: {
        color: themeStyles.textSecondary.color,
        fontSize: 13,
        marginTop: tokens.spacing.sm,
      },
    });
  }, [themeStyles, tokens]);

  const loadClips = useCallback(async () => {
    generationRef.current += 1;
    const generation = generationRef.current;
    setLoadMoreErrorKey(null);
    setIsLoadingMore(false);

    if (status !== 'authenticated') {
      setClips([]);
      setErrorKey(null);
      setHasMore(false);
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
      if (generation !== generationRef.current) {
        return;
      }
      setClips(response.data);
      setHasMore(listResponseHasMore(response.meta, response.data.length));
      pageRef.current = FIRST_PAGE;
    } catch {
      if (generation !== generationRef.current) {
        return;
      }
      setErrorKey('errors.generic');
      setClips([]);
      setHasMore(false);
    } finally {
      if (generation === generationRef.current) {
        setIsLoading(false);
      }
    }
  }, [accessToken, clearSession, refreshToken, setTokens, status]);

  const loadNextClipsPage = useCallback(async () => {
    if (status !== 'authenticated') {
      return;
    }

    const generation = generationRef.current;
    const nextPage = pageRef.current + 1;
    setIsLoadingMore(true);
    setLoadMoreErrorKey(null);
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
            page: nextPage,
          })
      );
      if (generation !== generationRef.current) {
        return;
      }
      setClips((current) => appendUniqueBy(current, response.data, myClipKeyExtractor));
      pageRef.current = nextPage;
      setHasMore(listResponseHasMore(response.meta, response.data.length));
    } catch {
      if (generation !== generationRef.current) {
        return;
      }
      setLoadMoreErrorKey('errors.generic');
    } finally {
      if (generation === generationRef.current) {
        setIsLoadingMore(false);
      }
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
  const handleEndReached = useLoadMoreOnEndReached({
    canLoadMore:
      status === 'authenticated' &&
      canLoadNextPage({
        hasError: errorKey !== null || loadMoreErrorKey !== null,
        hasMore,
        isLoading,
        isLoadingMore,
      }),
    loadMore: loadNextClipsPage,
  });
  const handleRetryNextPage = useCallback(() => {
    void loadNextClipsPage();
  }, [loadNextClipsPage]);

  const activeItemId = itemFromTarget(activeTarget)?.id_text ?? null;
  const prepareClipForEdit = useCallback(
    async (clip: DTOClip): Promise<void> => {
      const clipItem = clip.item;
      if (clipItem === null || clipItem === undefined) {
        return;
      }
      const clipChannel = clipItem.channel;
      if (clipChannel !== null && clipChannel !== undefined && activeItemId !== clipItem.id_text) {
        await loadItemPausedAt(clipItem, clipChannel, parseSeconds(clip.start_time));
      }
    },
    [activeItemId, loadItemPausedAt]
  );

  const listEmpty = useMemo(
    () => <ListEmpty messageKey="features.clip.no_clips_found" testID="library-my-clips-empty" />,
    []
  );
  const listFooter = useMemo(() => {
    const pageStatus = isLoadingMore ? (
      <ListLoading testID="library-my-clips-loading-more" />
    ) : loadMoreErrorKey !== null ? (
      <ListError
        messageKey={loadMoreErrorKey}
        onRetry={handleRetryNextPage}
        testID="library-my-clips-load-more-error"
      />
    ) : null;
    const playbackNotice =
      playbackNoticeKey !== null ? <Text style={styles.notice}>{t(playbackNoticeKey)}</Text> : null;
    if (pageStatus === null && playbackNotice === null) {
      return null;
    }
    return (
      <>
        {pageStatus}
        {playbackNotice}
      </>
    );
  }, [handleRetryNextPage, isLoadingMore, loadMoreErrorKey, playbackNoticeKey, styles.notice, t]);

  const renderItem = useCallback(
    ({ item: clip }: { item: DTOClip }) => (
      <LibraryMyClipRow
        clip={clip}
        onPlayPress={handlePlayPress}
        onPress={handleClipPress}
        onQueuePress={handleQueuePress}
        prepareClipForEdit={prepareClipForEdit}
      />
    ),
    [handleClipPress, handlePlayPress, handleQueuePress, prepareClipForEdit]
  );

  const showList = status === 'authenticated' && !isLoading && errorKey === null;

  return (
    <View style={styles.container} testID="library-my-clips-screen">
      {showList ? (
        <FillList
          ListEmptyComponent={listEmpty}
          ListFooterComponent={listFooter}
          contentContainerStyle={styles.listContent}
          data={clips}
          keyExtractor={myClipKeyExtractor}
          keyboardShouldPersistTaps="handled"
          onEndReached={handleEndReached}
          onEndReachedThreshold={LIST_END_REACHED_THRESHOLD}
          renderItem={renderItem}
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
