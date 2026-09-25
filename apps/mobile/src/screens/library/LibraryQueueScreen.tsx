import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import type { DTOQueueResource } from '@podverse/helpers/dto';
import type { QueueListMedium } from '@podverse/helpers/medium';
import { DEFAULT_QUEUE_LIST_MEDIUM, getQueueMediumIdFromType } from '@podverse/helpers/medium';

import { useAuth } from '../../auth/AuthProvider';
import type { OptionChipOption } from '../../components/form/OptionChipGroup';
import { OptionChipGroup } from '../../components/form/OptionChipGroup';
import {
  FillList,
  ReorderHandle,
  SwipeActionRow,
  VerticalCenter,
} from '../../components/primitives';
import type { ReorderDropEvent } from '../../components/reorder/ReorderableSections';
import { ReorderableSections } from '../../components/reorder/ReorderableSections';
import { AuthAwareLoadState } from '../../components/state/AuthAwareLoadState';
import { ListEmpty } from '../../components/state/ListEmpty';
import { ListError } from '../../components/state/ListError';
import { LoadingSection } from '../../components/state/LoadingSection';
import { useQueues } from '../../contexts/QueuesProvider';
import type { MobileAuthRequestContext } from '../../data';
import { queueRepository } from '../../data';
import { usePrimaryQueue } from '../../hooks/usePrimaryQueue';
import { useQueueResourcesLoadActive } from '../../hooks/useQueueResourcesLoadActive';
import { resolveListFill } from '../../lib/listFill';
import { playbackTargetRowMediaId } from '../../lib/playback/buildPlaybackTarget';
import { queueResourcesForQueueScreen } from '../../lib/queue/queueScreenResources';
import type { QueueReorderMutation } from '../../lib/reorder/resolveQueueDrop';
import { resolveQueueDrop } from '../../lib/reorder/resolveQueueDrop';
import type { QueueResourceHomeRow } from '../../lib/rows/homeRowMappers';
import { queueResourceToHomeRow } from '../../lib/rows/homeRowMappers';
import { useMembershipGate } from '../../membership/MembershipGateProvider';
import type { LibraryStackParamList } from '../../navigation';
import { usePlaybackSession } from '../../playback/PlaybackProvider';
import { screenBodyInsets } from '../../theme/screenLayout';
import { useTheme } from '../../theme/useTheme';
import { HomeFeedRow } from '../home/HomeFeedRow';

type LibraryQueueScreenProps = NativeStackScreenProps<LibraryStackParamList, 'LibraryQueue'>;

type QueueRow = QueueResourceHomeRow;
type QueueActionNoticeKey = 'errors.generic' | 'features.queue.remove_error';

const ACTION_MOVE_DOWN = 'moveDown';
const ACTION_MOVE_UP = 'moveUp';
const REORDER_DROP_SECTION_ID = 'queue';
const REORDER_LIST_SENTINEL = 'library-queue-reorder-root';

const queueListKeyExtractor = (entry: string): string => entry;
const queueRowKeyExtractor = (row: QueueRow): string => row.id;
const noopQueuePress = (): void => undefined;

type LibraryQueueRowProps = {
  isLast: boolean;
  onPlayAndRemove: (resource: DTOQueueResource) => void;
  onSwipeRemove: (resource: DTOQueueResource) => Promise<void>;
  removeLabel: string;
  resource: DTOQueueResource;
  row: QueueRow;
};

function LibraryQueueRow({
  isLast,
  onPlayAndRemove,
  onSwipeRemove,
  removeLabel,
  resource,
  row,
}: LibraryQueueRowProps) {
  const handlePlay = useCallback(() => {
    onPlayAndRemove(resource);
  }, [onPlayAndRemove, resource]);
  const handleRemove = useCallback(() => {
    return onSwipeRemove(resource);
  }, [onSwipeRemove, resource]);

  return (
    <SwipeActionRow
      onRemove={handleRemove}
      removeLabel={removeLabel}
      testID={`queue-row-${row.queueResourceId}-swipe`}
    >
      <HomeFeedRow
        customActions={null}
        isLast={isLast}
        mediaType={row.mediaType}
        onPlayPress={handlePlay}
        onPress={handlePlay}
        onQueuePress={noopQueuePress}
        row={row}
        trailing={<ReorderHandle testID={`queue-row-${row.queueResourceId}-reorder`} />}
      />
    </SwipeActionRow>
  );
}

export function LibraryQueueScreen(_props: LibraryQueueScreenProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();
  const { activeQueue, activeQueueUpcomingResources } = useQueues();
  const { fetchActiveQueueListMedium } = usePrimaryQueue();
  const { handleGateError } = useMembershipGate();
  const { activeTarget, playQueueResourceFromQueue } = usePlaybackSession();
  const loadActiveQueueResources = useQueueResourcesLoadActive();
  const dragTapBlockUntilRef = useRef<number>(0);
  const queueResourcesRef = useRef<readonly DTOQueueResource[]>([]);
  const loadRequestIdRef = useRef(0);
  const [selectedMedium, setSelectedMedium] = useState<QueueListMedium>(DEFAULT_QUEUE_LIST_MEDIUM);
  /** Medium whose rows are already in `queueResources`. Stays stale across a chip tap until load settles. */
  const [settledMedium, setSettledMedium] = useState<QueueListMedium | null>(null);
  const [queueResources, setQueueResources] = useState<readonly DTOQueueResource[]>([]);
  const [isMediumReady, setIsMediumReady] = useState<boolean>(false);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isDragActive, setIsDragActive] = useState<boolean>(false);
  const [isSavingOrder, setIsSavingOrder] = useState<boolean>(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [actionNoticeKey, setActionNoticeKey] = useState<QueueActionNoticeKey | null>(null);

  const playingContentId = activeTarget === null ? null : playbackTargetRowMediaId(activeTarget);

  useEffect(() => {
    const expectedMediumId = getQueueMediumIdFromType(selectedMedium);
    if (
      expectedMediumId === null ||
      activeQueue === null ||
      activeQueue.medium_id !== expectedMediumId
    ) {
      return;
    }

    const visibleResources = queueResourcesForQueueScreen(activeQueueUpcomingResources, {
      playingContentId,
      viewedQueueIsActive: activeQueue.is_active_queue === true,
    });
    queueResourcesRef.current = visibleResources;
    setQueueResources(visibleResources);
  }, [activeQueue, activeQueueUpcomingResources, playingContentId, selectedMedium]);

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
            loadRequestIdRef.current += 1;
            queueResourcesRef.current = [];
            setQueueResources([]);
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

  const queueRows = useMemo<QueueRow[]>(() => {
    return queueResources.flatMap((resource) => {
      const row = queueResourceToHomeRow(resource, 'queue', {
        addByRssPrivateTitle: t('features.add_by_rss.private_item_placeholder'),
      });
      return row === null ? [] : [row];
    });
  }, [queueResources, t]);

  const queueResourcesById = useMemo(() => {
    return new Map(queueResources.map((resource) => [resource.id, resource]));
  }, [queueResources]);

  const reorderData = useMemo<readonly string[]>(() => {
    return queueRows.length > 0 ? [REORDER_LIST_SENTINEL] : [];
  }, [queueRows.length]);

  const mediumOptions = useMemo<readonly OptionChipOption<QueueListMedium>[]>(
    () => [
      { label: t('media.podcast.podcasts'), testID: 'library-queue-medium-av', value: 'av' },
      { label: t('media.music.music'), testID: 'library-queue-medium-music', value: 'music' },
    ],
    [t]
  );

  const loadQueue = useCallback(
    async (options?: { refresh?: boolean }) => {
      if (!isMediumReady) {
        return;
      }

      const requestId = loadRequestIdRef.current + 1;
      loadRequestIdRef.current = requestId;
      const isCurrent = () => loadRequestIdRef.current === requestId;

      if (options?.refresh === true) {
        setIsRefreshing(true);
      } else {
        setIsInitialLoading(true);
      }
      setErrorKey(null);

      try {
        const result = await loadActiveQueueResources(
          getQueueMediumIdFromType(selectedMedium) ?? undefined
        );
        if (!isCurrent()) {
          return;
        }

        // Commit filtered rows in the same turn as clearing the spinner so ListEmpty cannot paint
        // an empty frame while the context→local effect has not run yet.
        const visibleResources = queueResourcesForQueueScreen(result.upcomingResources, {
          playingContentId,
          viewedQueueIsActive: result.activeQueue?.is_active_queue === true,
        });
        queueResourcesRef.current = visibleResources;
        setQueueResources(visibleResources);
        setSettledMedium(selectedMedium);
      } catch {
        if (!isCurrent()) {
          return;
        }
        setErrorKey('errors.generic');
        setSettledMedium(selectedMedium);
      } finally {
        if (isCurrent()) {
          setIsInitialLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [isMediumReady, loadActiveQueueResources, playingContentId, selectedMedium]
  );

  const buildAuthContext = useCallback(
    (): MobileAuthRequestContext => ({
      accessToken,
      clearSession,
      refreshToken,
      setTokens,
    }),
    [accessToken, clearSession, refreshToken, setTokens]
  );

  const removeResourceFromMemory = useCallback(
    (resourceId: number): { index: number; resource: DTOQueueResource } | null => {
      const current = queueResourcesRef.current;
      const index = current.findIndex((resource) => resource.id === resourceId);
      if (index < 0) {
        return null;
      }

      const resource = current[index];
      if (resource === undefined) {
        return null;
      }
      const next = [...current.slice(0, index), ...current.slice(index + 1)];
      queueResourcesRef.current = next;
      setQueueResources(next);
      return { index, resource };
    },
    []
  );

  const restoreResourceToMemory = useCallback(
    (snapshot: { index: number; resource: DTOQueueResource }) => {
      const current = queueResourcesRef.current;
      if (current.some((resource) => resource.id === snapshot.resource.id)) {
        return;
      }

      const next = [...current];
      const insertionIndex = Math.max(0, Math.min(snapshot.index, next.length));
      next.splice(insertionIndex, 0, snapshot.resource);
      queueResourcesRef.current = next;
      setQueueResources(next);
    },
    []
  );

  const removeResourceFromQueue = useCallback(
    async (resource: DTOQueueResource): Promise<void> => {
      if (activeQueue === null) {
        throw new Error('Cannot remove queue row without an active queue');
      }

      const context = buildAuthContext();
      if (
        typeof resource.add_by_rss_hash_id === 'string' &&
        resource.add_by_rss_hash_id.length > 0
      ) {
        await queueRepository.removeAddByRss(
          context,
          activeQueue.id_text,
          resource.add_by_rss_hash_id
        );
        return;
      }

      const soundbiteIdText = resource.item_soundbite?.id_text;
      if (soundbiteIdText !== null && soundbiteIdText !== undefined && soundbiteIdText.length > 0) {
        await queueRepository.removeSoundbite(context, activeQueue.id_text, soundbiteIdText);
        return;
      }

      const clipIdText = resource.clip?.id_text;
      if (clipIdText !== null && clipIdText !== undefined && clipIdText.length > 0) {
        await queueRepository.removeClip(context, activeQueue.id_text, clipIdText);
        return;
      }

      const itemIdText = resource.item?.id_text;
      if (itemIdText !== null && itemIdText !== undefined && itemIdText.length > 0) {
        await queueRepository.removeItem(context, activeQueue.id_text, itemIdText);
        return;
      }

      throw new Error('Queue row is missing a removable resource id');
    },
    [activeQueue, buildAuthContext]
  );

  const reconcileQueue = useCallback(async () => {
    await loadActiveQueueResources(getQueueMediumIdFromType(selectedMedium) ?? undefined);
  }, [loadActiveQueueResources, selectedMedium]);

  const updateQueueResourceListPosition = useCallback(
    (resourceId: number, listPosition: string) => {
      const updated = queueResourcesRef.current.map((resource) =>
        resource.id === resourceId ? { ...resource, list_position: listPosition } : resource
      );
      queueResourcesRef.current = updated;
      setQueueResources(updated);
    },
    []
  );

  const applyQueueReorderMutation = useCallback(
    async (mutation: QueueReorderMutation): Promise<DTOQueueResource | null> => {
      if (activeQueue === null) {
        throw new Error('Cannot reorder queue rows without an active queue');
      }

      const context = buildAuthContext();
      if (mutation.type === 'addBetween') {
        if (mutation.target.kind === 'clip') {
          return queueRepository.addClipBetween(
            context,
            activeQueue.id_text,
            mutation.target.idText,
            mutation.position1,
            mutation.position2
          );
        }
        if (mutation.target.kind === 'soundbite') {
          return queueRepository.addSoundbiteBetween(
            context,
            activeQueue.id_text,
            mutation.target.idText,
            mutation.position1,
            mutation.position2
          );
        }
        if (mutation.target.kind === 'add_by_rss') {
          return queueRepository.addAddByRssBetween(
            context,
            activeQueue.id_text,
            mutation.target.resourceData,
            mutation.position1,
            mutation.position2
          );
        }
        return queueRepository.addItemBetween(
          context,
          activeQueue.id_text,
          mutation.target.idText,
          mutation.position1,
          mutation.position2
        );
      }

      if (mutation.type === 'addNext') {
        if (mutation.target.kind === 'clip') {
          return queueRepository.addClipNext(context, activeQueue.id_text, mutation.target.idText);
        }
        if (mutation.target.kind === 'soundbite') {
          return queueRepository.addSoundbiteNext(
            context,
            activeQueue.id_text,
            mutation.target.idText
          );
        }
        if (mutation.target.kind === 'add_by_rss') {
          return queueRepository.addAddByRssNext(
            context,
            activeQueue.id_text,
            mutation.target.resourceData
          );
        }
        return queueRepository.addItemNext(context, activeQueue.id_text, mutation.target.idText);
      }

      if (mutation.target.kind === 'clip') {
        return queueRepository.addClipLast(context, activeQueue.id_text, mutation.target.idText);
      }
      if (mutation.target.kind === 'soundbite') {
        return queueRepository.addSoundbiteLast(
          context,
          activeQueue.id_text,
          mutation.target.idText
        );
      }
      if (mutation.target.kind === 'add_by_rss') {
        return queueRepository.addAddByRssLast(
          context,
          activeQueue.id_text,
          mutation.target.resourceData
        );
      }
      return queueRepository.addItemLast(context, activeQueue.id_text, mutation.target.idText);
    },
    [activeQueue, buildAuthContext]
  );

  const handleReorder = useCallback(
    async (fromIndex: number, toIndex: number): Promise<void> => {
      if (isSavingOrder) {
        return;
      }

      const resolved = resolveQueueDrop(queueResourcesRef.current, fromIndex, toIndex);
      if (resolved.kind === 'none') {
        return;
      }

      queueResourcesRef.current = resolved.reordered;
      setQueueResources(resolved.reordered);
      setActionNoticeKey(null);
      setIsSavingOrder(true);

      let reorderError: unknown = null;
      try {
        const moved = await applyQueueReorderMutation(resolved.mutation);
        if (moved !== null) {
          updateQueueResourceListPosition(resolved.mutation.movedResourceId, moved.list_position);
        }
      } catch (error) {
        reorderError = error;
        if (!handleGateError(error)) {
          setActionNoticeKey('errors.generic');
        }
      } finally {
        try {
          await reconcileQueue();
        } catch {
          // Best-effort reload keeps server order authoritative after drag failures.
        }
        setIsSavingOrder(false);
      }

      if (reorderError !== null) {
        return;
      }
    },
    [
      applyQueueReorderMutation,
      handleGateError,
      isSavingOrder,
      reconcileQueue,
      updateQueueResourceListPosition,
    ]
  );

  const handleDrop = useCallback(
    (event: ReorderDropEvent) => {
      if (
        event.fromSection !== REORDER_DROP_SECTION_ID ||
        event.toSection !== REORDER_DROP_SECTION_ID
      ) {
        return;
      }
      void handleReorder(event.fromIndex, event.toIndex);
    },
    [handleReorder]
  );

  const handleDragActiveChange = useCallback((isActive: boolean) => {
    setIsDragActive(isActive);
    if (!isActive) {
      dragTapBlockUntilRef.current = Date.now() + 300;
    }
  }, []);

  const handlePlayAndRemove = useCallback(
    (resource: DTOQueueResource) => {
      if (isDragActive || isSavingOrder || Date.now() < dragTapBlockUntilRef.current) {
        return;
      }

      const removed = removeResourceFromMemory(resource.id);
      if (removed === null) {
        return;
      }

      setActionNoticeKey(null);
      void (async () => {
        try {
          await playQueueResourceFromQueue(resource);
          await reconcileQueue();
        } catch (error) {
          restoreResourceToMemory(removed);
          if (!handleGateError(error)) {
            setActionNoticeKey('features.queue.remove_error');
          }
        }
      })();
    },
    [
      handleGateError,
      isDragActive,
      isSavingOrder,
      playQueueResourceFromQueue,
      reconcileQueue,
      removeResourceFromMemory,
      restoreResourceToMemory,
    ]
  );

  const handleSwipeRemove = useCallback(
    (resource: DTOQueueResource): Promise<void> => {
      if (isDragActive || isSavingOrder) {
        return Promise.resolve();
      }

      const removed = removeResourceFromMemory(resource.id);
      if (removed === null) {
        return Promise.resolve();
      }

      setActionNoticeKey(null);
      return (async () => {
        try {
          await removeResourceFromQueue(resource);
          await reconcileQueue();
        } catch (error) {
          restoreResourceToMemory(removed);
          if (!handleGateError(error)) {
            setActionNoticeKey('features.queue.remove_error');
          }
          throw error;
        }
      })();
    },
    [
      handleGateError,
      isDragActive,
      isSavingOrder,
      reconcileQueue,
      removeResourceFromMemory,
      removeResourceFromQueue,
      restoreResourceToMemory,
    ]
  );

  useEffect(() => {
    if (!isMediumReady) {
      return;
    }

    void loadQueue();
  }, [isMediumReady, loadQueue, status]);

  const handleMediumChange = useCallback(
    (nextMedium: QueueListMedium) => {
      if (nextMedium === selectedMedium) {
        return;
      }

      // Invalidate in-flight loads for the medium the user just left. Leave settledMedium stale so
      // ListEmpty cannot treat the cleared list as a settled empty for the new chip.
      loadRequestIdRef.current += 1;
      setSelectedMedium(nextMedium);
      queueResourcesRef.current = [];
      setQueueResources([]);
      setIsInitialLoading(true);
      setErrorKey(null);
    },
    [selectedMedium]
  );

  const handleRetry = useCallback(() => {
    void loadQueue();
  }, [loadQueue]);

  const handleRefresh = useCallback(() => {
    void loadQueue({ refresh: true });
  }, [loadQueue]);

  const emptyMessageKey =
    selectedMedium === 'music' ? 'features.queue.empty_music' : 'features.queue.empty_podcasts';
  const queueFill = resolveListFill({
    errorKey,
    isSettled: !isInitialLoading && settledMedium === selectedMedium,
    rowCount: queueRows.length,
  });
  const listEmpty = useMemo(() => {
    if (queueFill === 'loading') {
      return <LoadingSection testID="library-queue-loading" />;
    }
    if (queueFill === 'error' && errorKey !== null) {
      return (
        <VerticalCenter>
          <ListError messageKey={errorKey} onRetry={handleRetry} testID="library-queue-error" />
        </VerticalCenter>
      );
    }
    if (queueFill === 'empty') {
      return (
        <VerticalCenter>
          <ListEmpty messageKey={emptyMessageKey} testID="library-queue-empty" />
        </VerticalCenter>
      );
    }
    return null;
  }, [emptyMessageKey, errorKey, handleRetry, queueFill]);

  const listFooter = useMemo(
    () =>
      actionNoticeKey !== null ? <Text style={styles.notice}>{t(actionNoticeKey)}</Text> : null,
    [actionNoticeKey, styles.notice, t]
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.headerSection}>
        <OptionChipGroup
          onChange={handleMediumChange}
          options={mediumOptions}
          testID="library-queue-medium-chips"
          value={selectedMedium}
        />
        <View style={styles.listRule} />
      </View>
    ),
    [handleMediumChange, mediumOptions, selectedMedium, styles.headerSection, styles.listRule]
  );

  const removeLabel = t('features.queue.remove_from_queue');
  const renderQueueRow = useCallback(
    (row: QueueRow, context: { isLast: boolean }) => {
      const resource = queueResourcesById.get(row.queueResourceId);
      if (resource === undefined) {
        return null;
      }

      return (
        <LibraryQueueRow
          isLast={context.isLast}
          onPlayAndRemove={handlePlayAndRemove}
          onSwipeRemove={handleSwipeRemove}
          removeLabel={removeLabel}
          resource={resource}
          row={row}
        />
      );
    },
    [handlePlayAndRemove, handleSwipeRemove, queueResourcesById, removeLabel]
  );

  const renderReorderableQueue = useCallback(
    () => (
      <ReorderableSections
        dragActivation="row-long-press"
        keyExtractor={queueRowKeyExtractor}
        onDragActiveChange={handleDragActiveChange}
        onDrop={handleDrop}
        renderItem={renderQueueRow}
        renderSection={(_sectionId, children) => <View>{children}</View>}
        rowAccessibility={
          queueRows.length > 1
            ? (row, context) => {
                const actions = [
                  ...(context.index > 0
                    ? [{ label: t('misc.move_up'), name: ACTION_MOVE_UP }]
                    : []),
                  ...(context.index < queueRows.length - 1
                    ? [{ label: t('misc.move_down'), name: ACTION_MOVE_DOWN }]
                    : []),
                ];

                return {
                  actions,
                  label: row.title,
                  onAction: (name) => {
                    if (name === ACTION_MOVE_UP) {
                      void handleReorder(context.index, context.index - 1);
                      return;
                    }
                    if (name === ACTION_MOVE_DOWN) {
                      void handleReorder(context.index, context.index + 1);
                    }
                  },
                };
              }
            : undefined
        }
        rowContainerVariant="plain"
        sections={[{ id: REORDER_DROP_SECTION_ID, items: queueRows }]}
        showHandle={false}
      />
    ),
    [handleDragActiveChange, handleDrop, handleReorder, queueRows, renderQueueRow, t]
  );

  const showQueueRows = queueFill === 'ready';

  return (
    <View style={styles.container} testID="library-queue-screen">
      <AuthAwareLoadState
        emptyTestID="library-queue-auth-required"
        errorKey={null}
        isLoading={!isMediumReady}
        loadingTestID="library-queue-loading"
        onRetry={handleRetry}
        showAuthRequired={status !== 'authenticated'}
      >
        <FillList
          ListEmptyComponent={listEmpty}
          ListFooterComponent={listFooter}
          contentContainerStyle={styles.listContent}
          data={showQueueRows ? reorderData : []}
          keyExtractor={queueListKeyExtractor}
          ListHeaderComponent={listHeader}
          onRefresh={handleRefresh}
          refreshing={isRefreshing}
          renderItem={renderReorderableQueue}
          testID="library-queue-list"
        />
      </AuthAwareLoadState>
    </View>
  );
}
