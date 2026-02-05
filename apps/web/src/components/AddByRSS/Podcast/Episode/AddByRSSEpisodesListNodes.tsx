'use client';

import React from 'react';

import { Divider } from '../../../Divider/Divider';
import type { ViewSelectedOption } from '../../../ViewSelector/ViewSelector';
import styles from '../../../../styles/components/Common/List/ListNodes.module.scss';
import type { AddByRSSEpisodeIndexItem } from '../../../../utils/addByRSS/types';
import { AddByRSSEpisodeGridItem } from './AddByRSSEpisodeGridItem';
import { AddByRSSEpisodeRow } from './AddByRSSEpisodeRow';

type AddByRSSEpisodesListNodesProps = {
  items: AddByRSSEpisodeIndexItem[];
  viewSelected: ViewSelectedOption;
};

export const AddByRSSEpisodesListNodes: React.FC<AddByRSSEpisodesListNodesProps> = ({
  items,
  viewSelected,
}) => {
  if (viewSelected === 'rows') {
    return (
      <div key="list" className={styles.list}>
        {items.map((item, idx) => (
          <React.Fragment key={item.id}>
            <AddByRSSEpisodeRow
              itemGuid={item.itemGuid}
              feedTitle={item.feedTitle}
              feedImageUrl={item.feedImageUrl}
              bundle={item.bundle}
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
          <AddByRSSEpisodeGridItem key={item.id} item={item} showChannelInfo />
        ))}
      </div>
    );
  }
  return null;
};
