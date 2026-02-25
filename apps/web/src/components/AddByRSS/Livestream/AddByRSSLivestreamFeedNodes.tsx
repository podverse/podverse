'use client';

import React from 'react';

import { Divider } from '../../Divider/Divider';
import type { ViewSelectedOption } from '../../ViewSelector/ViewSelector';
import type { AddByRSSFeedRecord } from '../../../utils/addByRSS/types';
import { AddByRSSLivestreamFeedGridNode } from './AddByRSSLivestreamFeedGridNode';
import { AddByRSSLivestreamFeedRow } from './AddByRSSLivestreamFeedRow';
import styles from '../../../styles/components/Common/List/ListNodes.module.scss';

type AddByRSSLivestreamFeedNodesProps = {
  feeds: AddByRSSFeedRecord[];
  viewSelected: ViewSelectedOption;
};

export const AddByRSSLivestreamFeedNodes: React.FC<AddByRSSLivestreamFeedNodesProps> = ({
  feeds,
  viewSelected,
}) => {
  if (viewSelected === 'rows') {
    return (
      <div key="list" className={styles.list}>
        {feeds.map((feed, idx) => (
          <React.Fragment key={feed.idText}>
            <AddByRSSLivestreamFeedRow feed={feed} />
            {idx < feeds.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </div>
    );
  }

  if (viewSelected === 'grid') {
    return (
      <div key="grid" className={styles.grid}>
        {feeds.map((feed) => (
          <AddByRSSLivestreamFeedGridNode key={feed.idText} feed={feed} />
        ))}
      </div>
    );
  }

  return null;
};
