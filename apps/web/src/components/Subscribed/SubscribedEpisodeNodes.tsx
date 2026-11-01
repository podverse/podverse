'use client';

import React from 'react';

import type { DTOChannel, DTOItem } from '@podverse/helpers';
import { Divider } from '@podverse/ui';

import type { AddByRSSItemIndexItem } from '../../utils/addByRSS/types';
import type { SubscribedItemEntry } from '../../utils/subscribed/mergeSubscribedItems';
import { AddByRSSEpisodeGridCard } from '../AddByRSS/Podcast/Episode/AddByRSSEpisodeGridCard';
import { AddByRSSEpisodeRow } from '../AddByRSS/Podcast/Episode/AddByRSSEpisodeRow';
import { CommonEpisodeListGridNode } from '../Common/Podcast/Episode/CommonEpisodeGridNode';
import { CommonEpisodeListItemRow } from '../Common/Podcast/Episode/CommonEpisodeNodes';
import type { ViewSelectedOption } from '../ViewSelector/ViewSelector';

import styles from '../../styles/components/Common/List/ListNodes.module.scss';

type SubscribedEpisodeNodesProps = {
  entries: readonly SubscribedItemEntry[];
  viewSelected: ViewSelectedOption;
  showChannelInfo?: boolean;
};

type VisibleSubscribedEpisodeEntry =
  | { source: 'server'; item: DTOItem & { channel: DTOChannel } }
  | { source: 'add-by-rss'; item: AddByRSSItemIndexItem };

const isVisibleEntry = (entry: SubscribedItemEntry): entry is VisibleSubscribedEpisodeEntry => {
  if (entry.source === 'add-by-rss') {
    return true;
  }
  return entry.item.channel !== undefined && entry.item.channel !== null;
};

export const SubscribedEpisodeNodes: React.FC<SubscribedEpisodeNodesProps> = ({
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
      <div key="list" className={styles.list}>
        {visibleEntries.map((entry, idx) => (
          <React.Fragment key={entry.item.id}>
            {entry.source === 'server' ? (
              <CommonEpisodeListItemRow
                channel={entry.item.channel}
                item={entry.item}
                showChannelInfo={showChannelInfo}
              />
            ) : (
              <AddByRSSEpisodeRow
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
            <CommonEpisodeListGridNode
              key={entry.item.id}
              channel={entry.item.channel}
              item={entry.item}
              showChannelInfo={showChannelInfo}
            />
          ) : (
            <AddByRSSEpisodeGridCard
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
