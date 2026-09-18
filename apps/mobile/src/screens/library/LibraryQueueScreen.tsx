import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import type { DTOQueueResource } from '@podverse/helpers/dto';
import { getQueueMediumIdFromType } from '@podverse/helpers/medium';

import { useAuth } from '../../auth/AuthProvider';
import type { OptionChipOption } from '../../components/form/OptionChipGroup';
import { OptionChipGroup } from '../../components/form/OptionChipGroup';
import { FillList, SwipeActionRow, VerticalCenter } from '../../components/primitives';
import type { ReorderDropEvent } from '../../components/reorder/ReorderableSections';
import { ReorderableSections } from '../../components/reorder/ReorderableSections';
import { AuthAwareLoadState } from '../../components/state/AuthAwareLoadState';
import { ListEmpty } from '../../components/state/ListEmpty';
import { queueRepository } from '../../data';
import type { MobileAuthRequestContext } from '../../data';
import { useQueues } from '../../contexts/QueuesProvider';
import { useQueueResourcesLoadActive } from '../../hooks/useQueueResourcesLoadActive';
import type { QueueReorderMutation } from '../../lib/reorder/resolveQueueDrop';
import { resolveQueueDrop } from '../../lib/reorder/resolveQueueDrop';
import { useMembershipGate } from '../../membership/MembershipGateProvider';
import type { QueueResourceHomeRow } from '../../lib/rows/homeRowMappers';
import { queueResourceToHomeRow } from '../../lib/rows/homeRowMappers';
import type { LibraryStackParamList } from '../../navigation';
import { usePlaybackSession } from '../../playback/PlaybackProvider';
import {
  DEFAULT_QUEUE_LIST_MEDIUM,
  readQueueListMedium,
  writeQueueListMedium,
} from '../../prefs/queueListPrefs';
import type { QueueListMedium } from '../../prefs/queueListPrefs';
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

export function LibraryQueueScreen(_props: LibraryQueueScreenProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();
  const { activeQueue, activeQueueUpcomingResources } = useQueues();
  const { handleGateError } = useMembershipGate();
  const { playQueueResourceFromQueue } = usePlaybackSession();
  const loadActiveQueueResources = useQueueResourcesLoadActive();
  const dragTapBlockUntilRef = useRef<number>(0);
  const queueResourcesRef = useRef<readonly DTOQueueResource[]>([]);
  const [selectedMedium, setSelectedMedium] = useState<QueueListMedium>(DEFAULT_QUEUE_LIST_MEDIUM);
  const [queueResources, setQueueResources] = useState<readonly DTOQueueResource[]>([]);
  const [isMediumReady, setIsMediumReady] = useState<boolean>(false);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isDragActive, setIsDragActive] = useState<boolean>(false);
  const [isSavingOrder, setIsSavingOrder] = useState<boolean>(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [actionNoticeKey, setActionNoticeKey] = useState<QueueActionNoticeKey | null>(null);

  useEffect(() => {
    queueResourcesRef.current = activeQueueUpcomingResources;
    setQueueResources(activeQueueUpcomingResources);
  }, [activeQueueUpcomingResources]);

  useEffect(() => {
    let isMounted = true;
    void (async () => {
      const storedMedium = await readQueueListMedium();
      if (!isMounted) {
        return;
      }
      setSelectedMedium(storedMedium);
      setIsMediumReady(true);
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const styles = useMemo(
    () => {
      const bodyInsets = screenBodyInsets(tokens.spacing);
      return StyleSheet.create({
        container: {
          backgroundColor: themeStyles.screen.backgroundColor,
          flex: 1,
        },
        headerSection: {
          ...bodyInsets,
          gap: tokens.spacing.base,
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
    },
    [themeStyles, tokens]
  );

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

      if (options?.refresh === true) {
        setIsRefreshing(true);
      } else {
        setIsInitialLoading(true);
      }
      setErrorKey(null);

      try {
        await loadActiveQueueResources(getQueueMediumIdFromType(selectedMedium));
      } catch {
        setErrorKey('errors.generic');
      } finally {
        setIsInitialLoading(false);
        setIsRefreshing(false);
      }
    },
    [isMediumReady, loadActiveQueueResources, selectedMedium]
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
        await queueRepository.removeAddByRss(context, activeQueue.id_text, resource.add_by_rss_hash_id);
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
    await loadActiveQueueResources(getQueueMediumIdFromType(selectedMedium));
  }, [loadActiveQueueResources, selectedMedium]);

  const updateQueueResourceListPosition = useCallback((resourceId: number, listPosition: string) => {
    const updated = queueResourcesRef.current.map((resource) =>
      resource.id === resourceId ? { ...resource, list_position: listPosition } : resource
    );
    queueResourcesRef.current = updated;
    setQueueResources(updated);
  }, []);

  const applyQueueReorderMutation = useCallback(
    async (mutation: QueueReorderMutation): Promise<DTOQueueResource | null> => {
      if (activeQueue === null) {
        throw new Error('Cannot reorder queue rows without an active queue');
      }

      const context = buildAuthContext();
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

      if (mutation.type === 'addLast') {
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
      }

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
    [applyQueueReorderMutation, handleGateError, isSavingOrder, reconcileQueue, updateQueueResourceListPosition]
  );

  const handleDrop = useCallback(
    (event: ReorderDropEvent) => {
      if (event.fromSection !== REORDER_DROP_SECTION_ID || event.toSection !== REORDER_DROP_SECTION_ID) {
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

  const handleMediumChange = (nextMedium: QueueListMedium) => {
    setSelectedMedium(nextMedium);
    void writeQueueListMedium(nextMedium);
  };

  const listEmpty = (
    <VerticalCenter>
      <ListEmpty messageKey="misc.info" testID="library-queue-empty" />
    </VerticalCenter>
  );

  return (
    <View style={styles.container} testID="library-queue-screen">
      <AuthAwareLoadState
        emptyTestID="library-queue-auth-required"
        errorKey={errorKey}
        errorTestID="library-queue-error"
        isLoading={isInitialLoading || !isMediumReady}
        loadingTestID="library-queue-loading"
        onRetry={() => {
          void loadQueue();
        }}
        showAuthRequired={status !== 'authenticated'}
      >
        <FillList
          ListEmptyComponent={listEmpty}
          ListFooterComponent={
            actionNoticeKey !== null ? <Text style={styles.notice}>{t(actionNoticeKey)}</Text> : null
          }
          contentContainerStyle={styles.listContent}
          data={reorderData}
          keyExtractor={(entry) => entry}
          ListHeaderComponent={
            <View style={styles.headerSection}>
              <OptionChipGroup
                onChange={handleMediumChange}
                options={mediumOptions}
                testID="library-queue-medium-chips"
                value={selectedMedium}
              />
              <View style={styles.listRule} />
            </View>
          }
          onRefresh={() => {
            void loadQueue({ refresh: true });
          }}
          refreshing={isRefreshing}
          renderItem={() => (
            <ReorderableSections
              dragActivation="row-long-press"
              keyExtractor={(row) => row.id}
              onDragActiveChange={handleDragActiveChange}
              onDrop={handleDrop}
              renderItem={(row, context) => {
                const resource = queueResourcesById.get(row.queueResourceId);
                if (resource === undefined) {
                  return null;
                }

                return (
                  <SwipeActionRow
                    onRemove={() => handleSwipeRemove(resource)}
                    removeLabel={t('features.queue.remove_from_queue')}
                    testID={`queue-row-${row.queueResourceId}-swipe`}
                  >
                    <HomeFeedRow
                      customActions={null}
                      isLast={context.isLast}
                      mediaType={row.mediaType}
                      onPlayPress={() => {
                        handlePlayAndRemove(resource);
                      }}
                      onPress={() => {
                        handlePlayAndRemove(resource);
                      }}
                      onQueuePress={() => {}}
                      row={row}
                    />
                  </SwipeActionRow>
                );
              }}
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
          )}
          testID="library-queue-list"
        />
      </AuthAwareLoadState>
    </View>
  );
}
