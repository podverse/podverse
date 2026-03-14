'use client';

import React from 'react';

import type { AddByRSSListSortOrder } from '../../../../contexts/AddByRSSListContext';
import type { AddByRSSItemIndexItem } from '../../../../utils/addByRSS/types';
import { Divider } from '../../../Divider/Divider';
import type { ViewSelectedOption } from '../../../ViewSelector/ViewSelector';
import { AddByRSSEpisodeGridCard } from './AddByRSSEpisodeGridCard';
import { AddByRSSEpisodeRow } from './AddByRSSEpisodeRow';

import styles from '../../../../styles/components/Common/List/ListNodes.module.scss';

type AddByRSSEpisodesListNodesProps = {
  items: AddByRSSItemIndexItem[];
  viewSelected: ViewSelectedOption;
  sortOrder?: AddByRSSListSortOrder;
};

export const AddByRSSEpisodesListNodes: React.FC<AddByRSSEpisodesListNodesProps> = ({
  items,
  viewSelected,
  sortOrder = 'recent',
}) => {
  if (viewSelected === 'rows') {
    const feedIdText = items[0]?.channelIdText ?? '';
    const itemIdTexts = items.map((i) => i.idText);
    return (
      <div key="list" className={styles.list}>
        {items.map((item, idx) => (
          <React.Fragment key={item.id}>
            <AddByRSSEpisodeRow
              itemIdText={item.idText}
              channelTitle={item.channelTitle}
              channelImageUrl={item.channelImageUrl}
              bundle={item.bundle}
              indexItem={item}
              listContext={{
                feedIdText,
                itemIdTexts,
                currentIndex: idx,
                sortOrder,
              }}
            />
            {idx < items.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </div>
    );
  }
  if (viewSelected === 'grid') {
    return (
      <div key="grid" className={styles.grid}>
        {items.map((item) => (
          <AddByRSSEpisodeGridCard key={item.id} item={item} showChannelInfo />
        ))}
      </div>
    );
  }
  return null;
};
