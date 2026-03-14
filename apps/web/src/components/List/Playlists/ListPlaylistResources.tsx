'use client';

import type { DropResult } from '@hello-pangea/dnd';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import React from 'react';

import type { DTOPlaylist, DTOPlaylistResource } from '@podverse/helpers';
import { MediumEnum } from '@podverse/helpers';
import { getShuffleHash } from '@podverse/helpers-requests';

import { useAutoQueue } from '../../../contexts/AutoQueue';
import { getApiRequestService } from '../../../factories/apiRequestService';
import { useMediaPlayerResourceUpdate } from '../../../hooks/useMediaPlayerResourceUpdate';
import { usePlayAddByRSS } from '../../../hooks/usePlayAddByRSS';
import { useSkipInitialEffect } from '../../../hooks/useSkipInitialEffect';
import { loadAddByRSSIndexItemFromResourceData } from '../../../utils/addByRSS/playFromQueueResource';
import { scrollMainToTop } from '../../../utils/scroll';
import { Divider } from '../../Divider/Divider';
import Pagination from '../../Pagination/Pagination';
import { ListPlaylistResourceRow } from './ListPlaylistResourceRow';

import styles from '../../../styles/components/List/Playlists/ListPlaylistResources.module.scss';

type Props = {
  playlist: DTOPlaylist;
  playlistResources: DTOPlaylistResource[];
  isEditMode?: boolean;
  page?: number;
  setPage?: (page: number) => void;
  totalPages?: number;
  setIsLoading?: (loading: boolean) => void;
};

export const ListPlaylistResources: React.FC<Props> = ({
  playlist,
  playlistResources,
  isEditMode = false,
  page,
  setPage,
  totalPages = 1,
  setIsLoading: setLoadingFromParent,
}) => {
  const apiRequestService = getApiRequestService();
  const [resources, setResources] = React.useState(playlistResources);
  const mediaPlayerResourceUpdate = useMediaPlayerResourceUpdate();
  const playAddByRSS = usePlayAddByRSS();
  const { autoQueueConfig } = useAutoQueue();

  React.useEffect(() => {
    setResources(playlistResources);
  }, [playlistResources]);

  useSkipInitialEffect(() => {
    scrollMainToTop();
  }, [resources]);

  const createPlayHandler = (playlistResource: DTOPlaylistResource) => {
    return async () => {
      if (playlistResource.add_by_rss_hash_id) {
        const indexItem = await loadAddByRSSIndexItemFromResourceData(
          playlistResource.add_by_rss_resource_data
        );
        if (indexItem) {
          playAddByRSS(indexItem);
        }
        return;
      }

      const item = playlistResource.item;
      const clip = playlistResource.clip;
      const item_soundbite = playlistResource.item_soundbite;
      const playlistIdText = playlist.id_text ?? null;

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
              playlist_id_text: playlistIdText,
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
              playlist_id_text: playlistIdText,
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
              playlist_id_text: playlistIdText,
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

    const playlist_id_text = playlist?.id_text;
    if (!playlist_id_text) {
      console.warn('No playlist_id_text provided to ListPlaylistResources');
      return;
    }

    function getIdText(resource: DTOPlaylistResource) {
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

    function getType(resource: DTOPlaylistResource) {
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
    setLoadingFromParent?.(true);

    try {
      let updatedResource: DTOPlaylistResource | null = null;
      if (destIdx === 0) {
        if (movedType === 'add_by_rss' && removed.add_by_rss_resource_data) {
          updatedResource = await apiRequestService.reqPlaylistResourceItemAddByRSSAddFirst(
            playlist_id_text,
            { add_by_rss_resource_data: removed.add_by_rss_resource_data }
          );
        } else if (movedType === 'item') {
          updatedResource = await apiRequestService.reqPlaylistResourceItemAddFirst(
            playlist_id_text,
            movedIdText
          );
        } else if (movedType === 'clip') {
          updatedResource = await apiRequestService.reqPlaylistResourceClipAddFirst(
            playlist_id_text,
            movedIdText
          );
        } else if (movedType === 'item_soundbite') {
          updatedResource = await apiRequestService.reqPlaylistResourceItemSoundbiteAddFirst(
            playlist_id_text,
            movedIdText
          );
        }
      } else if (destIdx === reordered.length - 1) {
        if (movedType === 'add_by_rss' && removed.add_by_rss_resource_data) {
          updatedResource = await apiRequestService.reqPlaylistResourceItemAddByRSSAddLast(
            playlist_id_text,
            { add_by_rss_resource_data: removed.add_by_rss_resource_data }
          );
        } else if (movedType === 'item') {
          updatedResource = await apiRequestService.reqPlaylistResourceItemAddLast(
            playlist_id_text,
            movedIdText
          );
        } else if (movedType === 'clip') {
          updatedResource = await apiRequestService.reqPlaylistResourceClipAddLast(
            playlist_id_text,
            movedIdText
          );
        } else if (movedType === 'item_soundbite') {
          updatedResource = await apiRequestService.reqPlaylistResourceItemSoundbiteAddLast(
            playlist_id_text,
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
          updatedResource = await apiRequestService.reqPlaylistResourceItemAddByRSSAddBetween(
            playlist_id_text,
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
          updatedResource = await apiRequestService.reqPlaylistResourceItemAddBetween(
            playlist_id_text,
            movedIdText,
            { position1: String(prevPosition), position2: String(nextPosition) }
          );
        } else if (
          movedType === 'clip' &&
          prevPosition !== undefined &&
          nextPosition !== undefined
        ) {
          updatedResource = await apiRequestService.reqPlaylistResourceClipAddBetween(
            playlist_id_text,
            movedIdText,
            { position1: String(prevPosition), position2: String(nextPosition) }
          );
        } else if (
          movedType === 'item_soundbite' &&
          prevPosition !== undefined &&
          nextPosition !== undefined
        ) {
          updatedResource = await apiRequestService.reqPlaylistResourceItemSoundbiteAddBetween(
            playlist_id_text,
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
    } catch (err) {
      console.error('Error updating playlist order', err);
    }
    setLoadingFromParent?.(false);
  };

  const listWrapperClassName =
    playlist.medium_id === MediumEnum.Music ? styles.listTracks : styles.list;

  if (isEditMode) {
    return (
      <div className={listWrapperClassName}>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="playlist-list">
            {(provided) => (
              <div ref={provided.innerRef} className={styles.list} {...provided.droppableProps}>
                {resources.map((playlistResource, idx) => (
                  <Draggable
                    key={playlistResource.id}
                    draggableId={String(playlistResource.id)}
                    index={idx}
                  >
                    {(providedDraggable) => (
                      <div
                        ref={providedDraggable.innerRef}
                        {...providedDraggable.draggableProps}
                        {...providedDraggable.dragHandleProps}
                      >
                        <ListPlaylistResourceRow
                          playlistResource={playlistResource}
                          removeFromPlaylist={() => {
                            const updatedResources = resources.filter(
                              (res) => res.id !== playlistResource.id
                            );
                            setResources(updatedResources);
                          }}
                          isEditModePlaylist
                          playlist={playlist}
                          onPlay={createPlayHandler(playlistResource)}
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
    );
  } else {
    if (setPage === undefined) {
      return null;
    }

    return (
      <div className={styles.listWrapper}>
        <Pagination currentPage={page ?? 1} totalPages={totalPages ?? 1} setPage={setPage}>
          <div className={styles.list}>
            {resources.map((playlistResource, idx) => (
              <React.Fragment key={playlistResource.id}>
                <ListPlaylistResourceRow
                  playlistResource={playlistResource}
                  removeFromPlaylist={() => {}}
                  isEditModePlaylist={false}
                  playlist={playlist}
                  onPlay={createPlayHandler(playlistResource)}
                />
                {idx < resources.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </div>
        </Pagination>
      </div>
    );
  }
};
