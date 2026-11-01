'use client';

import React from 'react';

import type { DTOChannel, DTOItem } from '@podverse/helpers';
import { Divider } from '@podverse/ui';

import type { AddByRSSItemIndexItem } from '../../utils/addByRSS/types';
import type { SubscribedItemEntry } from '../../utils/subscribed/mergeSubscribedItems';
import { AddByRSSTrackGridCard } from '../AddByRSS/Artist/Album/Track/AddByRSSTrackGridCard';
import { AddByRSSTrackRow } from '../AddByRSS/Artist/Album/Track/AddByRSSTrackRow';
import { CommonTrackListGridNode } from '../Common/Artist/Album/Track/CommonTrackGridNode';
import { CommonTrackListItemRow } from '../Common/Artist/Album/Track/CommonTrackNodes';
import type { ViewSelectedOption } from '../ViewSelector/ViewSelector';

import styles from '../../styles/components/Common/List/ListNodes.module.scss';

type SubscribedTrackNodesProps = {
  entries: readonly SubscribedItemEntry[];
  viewSelected: ViewSelectedOption;
  showChannelInfo?: boolean;
};

type VisibleSubscribedTrackEntry =
  | { source: 'server'; item: DTOItem & { channel: DTOChannel } }
  | { source: 'add-by-rss'; item: AddByRSSItemIndexItem };

const isVisibleEntry = (entry: SubscribedItemEntry): entry is VisibleSubscribedTrackEntry => {
  if (entry.source === 'add-by-rss') {
    return true;
  }
  return entry.item.channel !== undefined && entry.item.channel !== null;
};

export const SubscribedTrackNodes: React.FC<SubscribedTrackNodesProps> = ({
  entries,
  viewSelected,
  showChannelInfo,
}) => {
  const addByRSSItems = entries.flatMap((entry) =>
    entry.source === 'add-by-rss' ? [entry.item] : []
  );
  const itemIdTexts = addByRSSItems.map((item) => item.idText);
  const feedIdText = addByRSSItems[0]?.channelIdText ?? '';
  const addByRSSIndexById = new Map(addByRSSItems.map((item, index) => [item.id, index]));
  const visibleEntries = entries.filter(isVisibleEntry);

  if (viewSelected === 'rows') {
    return (
      <div key="list" className={styles.listTracks}>
        {visibleEntries.map((entry, idx) => (
          <React.Fragment key={entry.item.id}>
            {entry.source === 'server' ? (
              <CommonTrackListItemRow
                channel={entry.item.channel}
                item={entry.item}
                showChannelInfo={showChannelInfo}
              />
            ) : (
              <AddByRSSTrackRow
                itemIdText={entry.item.idText}
                channelTitle={entry.item.channelTitle}
                channelImageUrl={entry.item.channelImageUrl}
                bundle={entry.item.bundle}
                indexItem={entry.item}
                listContext={{
                  feedIdText,
                  itemIdTexts,
                  currentIndex: addByRSSIndexById.get(entry.item.id) ?? 0,
                  sortOrder: 'recent',
                }}
                showChannelInfo={showChannelInfo}
              />
            )}
            {idx < visibleEntries.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </div>
    );
  }

  if (viewSelected === 'grid') {
    return (
      <div key="grid" className={styles.grid}>
        {visibleEntries.map((entry) =>
          entry.source === 'server' ? (
            <CommonTrackListGridNode
              key={entry.item.id}
              channel={entry.item.channel}
              item={entry.item}
              showChannelInfo={showChannelInfo}
            />
          ) : (
            <AddByRSSTrackGridCard
              key={entry.item.id}
              item={entry.item}
              showChannelInfo={showChannelInfo}
            />
          )
        )}
      </div>
    );
  }

  return null;
};
