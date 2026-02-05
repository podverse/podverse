'use client';

import React from 'react';

import { Divider } from '../../Divider/Divider';
import type { ViewSelectedOption } from '../../ViewSelector/ViewSelector';
import styles from '../../../styles/components/Common/List/ListNodes.module.scss';
import type { AddByRSSFeedRecord } from '../../../utils/addByRSS/types';
import { AddByRSSLivestreamGridNode } from './AddByRSSLivestreamGridNode';
import { AddByRSSLivestreamRow } from './AddByRSSLivestreamRow';

type AddByRSSLivestreamNodesProps = {
  feeds: AddByRSSFeedRecord[];
  viewSelected: ViewSelectedOption;
};

export const AddByRSSLivestreamNodes: React.FC<AddByRSSLivestreamNodesProps> = ({
  feeds,
  viewSelected,
}) => {
  if (viewSelected === 'rows') {
    return (
      <div key="list" className={styles.list}>
        {feeds.map((feed, idx) => (
          <React.Fragment key={feed.idText}>
            <AddByRSSLivestreamRow feed={feed} />
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
          <AddByRSSLivestreamGridNode key={feed.idText} feed={feed} />
        ))}
      </div>
    );
  }

  return null;
};
