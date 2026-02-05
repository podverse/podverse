'use client';

import React from 'react';

import { Divider } from '../../../../Divider/Divider';
import type { ViewSelectedOption } from '../../../../ViewSelector/ViewSelector';
import styles from '../../../../../styles/components/Common/List/ListNodes.module.scss';
import type { AddByRSSFeedRecord } from '../../../../../utils/addByRSS/types';
import { AddByRSSTrackGridNode } from './AddByRSSTrackGridNode';
import { AddByRSSTrackRow } from './AddByRSSTrackRow';

type AddByRSSTrackNodesProps = {
  feeds: AddByRSSFeedRecord[];
  viewSelected: ViewSelectedOption;
};

export const AddByRSSTrackNodes: React.FC<AddByRSSTrackNodesProps> = ({ feeds, viewSelected }) => {
  if (viewSelected === 'rows') {
    return (
      <div key="list" className={styles.listTracks}>
        {feeds.map((feed, idx) => (
          <React.Fragment key={feed.idText}>
            <AddByRSSTrackRow feed={feed} />
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
