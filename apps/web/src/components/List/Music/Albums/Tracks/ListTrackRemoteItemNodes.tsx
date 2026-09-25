'use client';

import React from 'react';

import type { DTOChannel, DTOItem, EpisodeByGuidResponse } from '@podverse/helpers';
import {
  buildAlbumPath,
  buildPodcastIndexFeedPath,
  resolveUnaddedTrackParentAlbum,
} from '@podverse/helpers';
import { Divider } from '@podverse/ui';

import type { ViewSelectedOption } from '../../../../ViewSelector/ViewSelector';
import { ListLiveItemRow } from '../../../LiveItem/ListLiveItemRow';
import { ListTrackGridNode } from './ListTrackGridNode';
import { ListTrackGridNodeUnadded } from './ListTrackGridNodeUnadded';
import { ListTrackRow } from './ListTrackRow';
import { ListTrackRowRemoteItemUnadded } from './ListTrackRowRemoteItemUnadded';

import styles from '../../../../../styles/components/Common/List/ListNodes.module.scss';

interface Params {
  channelsAdded: DTOChannel[];
  itemsAdded: DTOItem[];
  itemsUnadded: NonNullable<EpisodeByGuidResponse['episode']>[];
  viewSelected: ViewSelectedOption;
  showChannelInfo?: boolean;
}

type VisibleUnaddedTrack = {
  href: string;
  item: NonNullable<EpisodeByGuidResponse['episode']>;
};

function visibleUnaddedTracks(
  itemsUnadded: NonNullable<EpisodeByGuidResponse['episode']>[],
  channelsAdded: DTOChannel[]
): VisibleUnaddedTrack[] {
  const visible: VisibleUnaddedTrack[] = [];
  for (const item of itemsUnadded) {
    const target = resolveUnaddedTrackParentAlbum({
      albums: channelsAdded,
      feedGuid: item.feedGuid,
      feedId: item.feedId,
    });
    if (target === null) {
      continue;
    }
    visible.push({
      href:
        target.kind === 'album'
          ? buildAlbumPath(target.albumIdText)
          : buildPodcastIndexFeedPath(target.podcastIndexId),
      item,
    });
  }
  return visible;
}

export function ListTrackRemoteItemNodes({
  channelsAdded,
  itemsAdded,
  itemsUnadded,
  viewSelected,
  showChannelInfo,
}: Params): React.ReactNode {
  // Filter out items without channels
  const itemsWithChannels = itemsAdded.filter(
    (item) => item.channel !== null && item.channel !== undefined
  );

  const unaddedTracks = visibleUnaddedTracks(itemsUnadded, channelsAdded);

  if (viewSelected === 'rows') {
    return (
      <div key="list" className={styles.listTracks}>
        {itemsWithChannels.map((itemAdded, idx) => {
          const rowChannel = itemAdded.channel;
          if (!rowChannel) {
            return null;
          }
          return (
            <React.Fragment key={itemAdded.id}>
              {itemAdded.live_item ? (
                <ListLiveItemRow
                  channel={rowChannel}
                  item={itemAdded}
                  live_item={itemAdded.live_item}
                  showChannelInfo={showChannelInfo}
                  showLiveItemStatus
                />
              ) : (
                <ListTrackRow
                  channel={rowChannel}
                  item={itemAdded}
                  showChannelInfo={showChannelInfo}
                  playlist_id_text={null}
                />
              )}
              {idx < itemsWithChannels.length - 1 && <Divider />}
            </React.Fragment>
          );
        })}
        {unaddedTracks.map((unadded, idx) => (
          <React.Fragment key={unadded.item.guid}>
            <ListTrackRowRemoteItemUnadded
              href={unadded.href}
              itemUnadded={unadded.item}
              showChannelInfo={showChannelInfo}
            />
            {idx < unaddedTracks.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </div>
    );
  }

  if (viewSelected === 'grid') {
    return (
      <div key="grid" className={styles.grid}>
        {itemsWithChannels.map((itemAdded) => {
          const rowChannel = itemAdded.channel;
          if (!rowChannel) {
            return null;
          }
          return (
            <ListTrackGridNode
              key={itemAdded.id}
              channel={rowChannel}
              item={itemAdded}
              showChannelInfo={showChannelInfo}
            />
          );
        })}
        {unaddedTracks.map((unadded) => {
          return (
            <ListTrackGridNodeUnadded
              key={unadded.item.guid}
              href={unadded.href}
              itemUnadded={unadded.item}
              showChannelInfo={showChannelInfo}
            />
          );
        })}
      </div>
    );
  }

  return null;
}
