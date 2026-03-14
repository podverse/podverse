'use client';

import React from 'react';

import type { AddByRSSListSortOrder } from '../../../contexts/AddByRSSListContext';
import type { AddByRSSLivestreamIndexItem } from '../../../utils/addByRSS/types';
import { Divider } from '../../Divider/Divider';
import type { ViewSelectedOption } from '../../ViewSelector/ViewSelector';
import { AddByRSSLivestreamGridNode } from './AddByRSSLivestreamGridNode';
import { AddByRSSLivestreamRow } from './AddByRSSLivestreamRow';

import styles from '../../../styles/components/Common/List/ListNodes.module.scss';

type AddByRSSLivestreamNodesProps = {
  items: AddByRSSLivestreamIndexItem[];
  viewSelected: ViewSelectedOption;
  showChannelInfo?: boolean;
  sortOrder?: AddByRSSListSortOrder;
};

export const AddByRSSLivestreamNodes: React.FC<AddByRSSLivestreamNodesProps> = ({
  items,
  viewSelected,
  showChannelInfo,
  sortOrder = 'recent',
}) => {
  if (items.length === 0) {
    return null;
  }

  if (viewSelected === 'rows') {
    const feedIdText = items[0]?.channelIdText ?? '';
    const itemIdTexts = items.map((i) => i.idText);
    return (
      <div key="list" className={styles.list}>
        {items.map((item, idx) => (
          <React.Fragment key={item.id}>
            <AddByRSSLivestreamRow
              item={item}
              showChannelInfo={showChannelInfo}
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
          <AddByRSSLivestreamGridNode key={item.id} item={item} showChannelInfo={showChannelInfo} />
        ))}
      </div>
    );
  }

  return null;
};
