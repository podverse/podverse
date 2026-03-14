'use client';

import React from 'react';

import type { AddByRSSFeedRecord } from '../../../../../utils/addByRSS/types';
import { Divider } from '../../../../Divider/Divider';
import type { ViewSelectedOption } from '../../../../ViewSelector/ViewSelector';
import { AddByRSSTrackFeedRow } from './AddByRSSTrackFeedRow';
import { AddByRSSTrackGridNode } from './AddByRSSTrackGridNode';

import styles from '../../../../../styles/components/Common/List/ListNodes.module.scss';

type AddByRSSTrackFeedNodesProps = {
  feeds: AddByRSSFeedRecord[];
  viewSelected: ViewSelectedOption;
};

export const AddByRSSTrackFeedNodes: React.FC<AddByRSSTrackFeedNodesProps> = ({
  feeds,
  viewSelected,
}) => {
  if (viewSelected === 'rows') {
    return (
      <div key="list" className={styles.listTracks}>
        {feeds.map((feed, idx) => (
          <React.Fragment key={feed.idText}>
            <AddByRSSTrackFeedRow feed={feed} />
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
          <AddByRSSTrackGridNode key={feed.idText} feed={feed} />
        ))}
      </div>
    );
  }

  return null;
};
