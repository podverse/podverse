'use client';

import type { DropResult } from '@hello-pangea/dnd';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useTranslations } from 'next-intl';
import type { DTOQueueResource, QueryParamsQueueMedium } from '@podverse/helpers';
import { getQueueMediumIdFromType, MediumEnum } from '@podverse/helpers';
import { getShuffleHash } from '@podverse/helpers-requests';
import React from 'react';
import { CallToActionMessage } from '../../CallToActionMessage/CallToActionMessage';
import { useModals } from '../../../contexts/Modals';
import { ListQueueResourceRow } from './ListQueueResourceRow';
import { apiRequestService } from '../../../factories/apiRequestService';
import { useQueues } from '../../../contexts/Queue';
import { useQueueResourcesLoadActive } from '../../../hooks/useQueueResourcesLoadActive';
import { useMediaPlayerResourceUpdate } from '../../../hooks/useMediaPlayerResourceUpdate';
import { usePlayAddByRSS } from '../../../hooks/usePlayAddByRSS';
import { useAutoQueue } from '../../../contexts/AutoQueue';
import { loadAddByRSSIndexItemFromResourceData } from '../../../utils/addByRSS/playFromQueueResource';
import styles from '../../../styles/components/List/Queues/ListQueueResources.module.scss';

type Props = {
  queueMedium: QueryParamsQueueMedium;
  queueResources: DTOQueueResource[];
  showLoginMessage: boolean;
};

export const ListQueueResources: React.FC<Props> = ({
  queueMedium,
  queueResources,
  showLoginMessage,
}) => {
  const tInstructions = useTranslations('instructions');
  const tAuthentication = useTranslations('authentication');
  const { setModalAuthLogin } = useModals();
  const { activeQueue } = useQueues();
  const queueResourcesLoadActive = useQueueResourcesLoadActive();
  const [resources, setResources] = React.useState(queueResources);
  const mediaPlayerResourceUpdate = useMediaPlayerResourceUpdate();
  const playAddByRSS = usePlayAddByRSS();
  const { autoQueueConfig } = useAutoQueue();

  React.useEffect(() => {
    setResources(queueResources);
  }, [queueResources]);

  const createPlayAndRemoveHandler = (queueResource: DTOQueueResource) => {
    return async () => {
      // Remove from visual list immediately
      const updatedResources = resources.filter((res) => res.id !== queueResource.id);
      setResources(updatedResources);

      // Handle add-by-RSS items
      if (queueResource.add_by_rss_hash_id) {
        const resourceData = queueResource.add_by_rss_resource_data;
        const indexItem = await loadAddByRSSIndexItemFromResourceData(resourceData);
        if (indexItem) {
          const playbackPosition = queueResource.playback_position
            ? parseFloat(String(queueResource.playback_position))
            : undefined;
          playAddByRSS(
            indexItem,
            playbackPosition !== undefined && !Number.isNaN(playbackPosition)
              ? playbackPosition
              : undefined
          );
        }
        return;
      }

      // Handle regular items
      const item = queueResource.item;
      const clip = queueResource.clip;
      const item_soundbite = queueResource.item_soundbite;

      if (clip) {
        const clipItem = clip.item;
        const channel = clipItem?.channel;
        if (channel && clipItem) {
          mediaPlayerResourceUpdate({
            channel,
            clip,
            item: clipItem,
            itemChapter: null,
            itemChapterShouldSeek: false,
            itemSoundbite: null,
            isPlaying: true,
            shouldPlay: true,
            skipMoveNowPlayingToHistory: false,
            enclosureSelectedParams: 'use-active-item-or-default',
            newAutoQueueConfig: {
              playlist_id_text: null,
              disabled: false,
              random: autoQueueConfig.random,
              repeat: autoQueueConfig.repeat,
              nextPage: 1,
              shuffleHash: getShuffleHash(),
            },
            autoQueueShouldClear: true,
          });
        }
      } else if (item_soundbite) {
        const soundbiteItem = item_soundbite.item;
        const channel = soundbiteItem?.channel;
        if (channel && soundbiteItem) {
          mediaPlayerResourceUpdate({
            channel,
            clip: null,
            item: soundbiteItem,
            itemChapter: null,
            itemChapterShouldSeek: false,
            itemSoundbite: item_soundbite,
            isPlaying: true,
            shouldPlay: true,
            skipMoveNowPlayingToHistory: false,
            enclosureSelectedParams: 'use-active-item-or-default',
            newAutoQueueConfig: {
              playlist_id_text: null,
              disabled: false,
              random: autoQueueConfig.random,
              repeat: autoQueueConfig.repeat,
              nextPage: 1,
              shuffleHash: getShuffleHash(),
            },
            autoQueueShouldClear: true,
          });
        }
      } else if (item) {
        const channel = item.channel;
        if (channel) {
          mediaPlayerResourceUpdate({
            channel,
            clip: null,
            item,
            itemChapter: null,
            itemChapterShouldSeek: false,
            itemSoundbite: null,
            isPlaying: true,
            shouldPlay: true,
            skipMoveNowPlayingToHistory: false,
            enclosureSelectedParams: 'use-active-item-or-default',
            newAutoQueueConfig: {
              playlist_id_text: null,
              disabled: false,
              random: autoQueueConfig.random,
              repeat: autoQueueConfig.repeat,
              nextPage: 1,
              shuffleHash: getShuffleHash(),
            },
            autoQueueShouldClear: true,
          });
        }
      }
    };
  };

  const showCallToAction = showLoginMessage;
  const showPagination = !showLoginMessage;

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) {
      return;
    }
    const reordered = Array.from(resources);
    const [removed] = reordered.splice(result.source.index, 1);
    if (!removed) {
      console.warn('No resource found at source index');
      return;
    }
    reordered.splice(result.destination.index, 0, removed);
    setResources(reordered);

    const queue_id_text = activeQueue?.id_text;
    if (!queue_id_text) {
      console.warn('No queue_id_text provided to ListQueueResources');
      return;
    }

    function getIdText(resource: DTOQueueResource) {
      if (resource.add_by_rss_hash_id) {
        return resource.add_by_rss_hash_id;
      }
      if (resource.clip) {
        return resource.clip.id_text;
      }
      if (resource.item_soundbite) {
        return resource.item_soundbite.id_text;
      }
      if (resource.item) {
        return resource.item.id_text;
      }
      return undefined;
    }

    function getType(resource: DTOQueueResource) {
      if (resource.add_by_rss_hash_id) {
        return 'add_by_rss';
      }
      if (resource.clip) {
        return 'clip';
      }
      if (resource.item_soundbite) {
        return 'item_soundbite';
      }
      if (resource.item) {
        return 'item';
      }
      return undefined;
    }

    const movedType = getType(removed);
    const movedIdText = getIdText(removed);

    if (!movedType || !movedIdText) {
      console.warn('Could not determine moved resource type or id_text');
      return;
    }

    const destIdx = result.destination.index;
    const prevResource = reordered[destIdx - 1];
    const nextResource = reordered[destIdx + 1];

    try {
      let updatedResource: DTOQueueResource | null = null;
      if (destIdx === 0) {
        if (movedType === 'add_by_rss' && removed.add_by_rss_resource_data) {
          updatedResource = await apiRequestService.reqQueueResourceItemAddByRSSAddNext(
            queue_id_text,
            { add_by_rss_resource_data: removed.add_by_rss_resource_data }
          );
        } else if (movedType === 'item') {
          updatedResource = await apiRequestService.reqQueueResourceItemAddNext(
            queue_id_text,
            movedIdText
          );
        } else if (movedType === 'clip') {
          updatedResource = await apiRequestService.reqQueueResourceClipAddNext(
            queue_id_text,
            movedIdText
          );
        } else if (movedType === 'item_soundbite') {
          updatedResource = await apiRequestService.reqQueueResourceItemSoundbiteAddNext(
            queue_id_text,
            movedIdText
          );
        }
      } else if (destIdx === reordered.length - 1) {
        if (movedType === 'add_by_rss' && removed.add_by_rss_resource_data) {
          updatedResource = await apiRequestService.reqQueueResourceItemAddByRSSAddLast(
            queue_id_text,
            { add_by_rss_resource_data: removed.add_by_rss_resource_data }
          );
        } else if (movedType === 'item') {
          updatedResource = await apiRequestService.reqQueueResourceItemAddLast(
            queue_id_text,
            movedIdText
          );
        } else if (movedType === 'clip') {
          updatedResource = await apiRequestService.reqQueueResourceClipAddLast(
            queue_id_text,
            movedIdText
          );
        } else if (movedType === 'item_soundbite') {
          updatedResource = await apiRequestService.reqQueueResourceItemSoundbiteAddLast(
            queue_id_text,
            movedIdText
          );
        }
      } else {
        const prevPosition = prevResource ? prevResource.list_position : undefined;
        const nextPosition = nextResource ? nextResource.list_position : undefined;
        if (
          movedType === 'add_by_rss' &&
          removed.add_by_rss_resource_data &&
          prevPosition !== undefined &&
          nextPosition !== undefined
        ) {
          updatedResource = await apiRequestService.reqQueueResourceItemAddByRSSAddBetween(
            queue_id_text,
            {
              add_by_rss_resource_data: removed.add_by_rss_resource_data,
              position1: String(prevPosition),
              position2: String(nextPosition),
            }
          );
        } else if (
          movedType === 'item' &&
          prevPosition !== undefined &&
          nextPosition !== undefined
        ) {
          updatedResource = await apiRequestService.reqQueueResourceItemAddBetween(
            queue_id_text,
            movedIdText,
            { position1: String(prevPosition), position2: String(nextPosition) }
          );
        } else if (
          movedType === 'clip' &&
          prevPosition !== undefined &&
          nextPosition !== undefined
        ) {
          updatedResource = await apiRequestService.reqQueueResourceClipAddBetween(
            queue_id_text,
            movedIdText,
            { position1: String(prevPosition), position2: String(nextPosition) }
          );
        } else if (
          movedType === 'item_soundbite' &&
          prevPosition !== undefined &&
          nextPosition !== undefined
        ) {
          updatedResource = await apiRequestService.reqQueueResourceItemSoundbiteAddBetween(
            queue_id_text,
            movedIdText,
            { position1: String(prevPosition), position2: String(nextPosition) }
          );
        }
      }

      const updatedReordered = [...reordered];
      if (updatedResource) {
        const updatedListPosition = updatedResource.list_position;
        const movedResource = updatedReordered[destIdx];

        if (!movedResource || !removed) {
          return;
        }

        if (
          movedType === 'add_by_rss' &&
          movedResource.add_by_rss_hash_id === removed.add_by_rss_hash_id
        ) {
          updatedReordered[destIdx] = {
            ...movedResource,
            list_position: updatedListPosition,
          };
        } else if (movedType === 'clip' && movedResource.clip_id === removed.clip_id) {
          updatedReordered[destIdx] = {
            ...movedResource,
            list_position: updatedListPosition,
          };
        } else if (
          movedType === 'item_soundbite' &&
          movedResource.item_soundbite_id === removed.item_soundbite_id
        ) {
          updatedReordered[destIdx] = {
            ...movedResource,
            list_position: updatedListPosition,
          };
        } else if (movedType === 'item' && movedResource.item_id === removed.item_id) {
          updatedReordered[destIdx] = {
            ...movedResource,
            list_position: updatedListPosition,
          };
        }
      }

      setResources(updatedReordered);

      await queueResourcesLoadActive();
    } catch (err) {
      console.error('Error updating queue order', err);
    }
  };

  const isMusic = getQueueMediumIdFromType(queueMedium) === MediumEnum.Music;
  const listWrapperClassName = isMusic ? styles.listTracks : styles.list;
  const queueListClassName = isMusic ? styles.queueListMusic : styles.queueListAV;

  return (
    <>
      {showCallToAction && (
        <CallToActionMessage
          message={tInstructions('login_for_queues')}
          buttonLabel={tAuthentication('login')}
          onButtonClick={() => setModalAuthLogin({ isOpen: true })}
        />
      )}
      {showPagination && (
        <div className={styles.listWrapper}>
          <div className={listWrapperClassName}>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="queue-list">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    className={queueListClassName}
                    {...provided.droppableProps}
                  >
                    {resources.map((queueResource, idx) => (
                      <Draggable
                        key={queueResource.id}
                        draggableId={String(queueResource.id)}
                        index={idx}
                      >
                        {(providedDraggable) => (
                          <div
                            ref={providedDraggable.innerRef}
                            {...providedDraggable.draggableProps}
                            {...providedDraggable.dragHandleProps}
                          >
                            <ListQueueResourceRow
                              queueResource={queueResource}
                              removeFromQueue={() => {
                                const updatedResources = resources.filter(
                                  (res) => res.id !== queueResource.id
                                );
                                setResources(updatedResources);
                              }}
                              isEditModeQueue={true}
                              onPlayAndRemove={createPlayAndRemoveHandler(queueResource)}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        </div>
      )}
    </>
  );
};
