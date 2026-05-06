'use client';

import React from 'react';

import { Divider } from '@podverse/ui';

import type { AddByRSSFeedRecord } from '../../../../utils/addByRSS/types';
import type { ViewSelectedOption } from '../../../ViewSelector/ViewSelector';
import { AddByRSSAlbumGridNode } from './AddByRSSAlbumGridNode';
import { AddByRSSAlbumRow } from './AddByRSSAlbumRow';

import styles from '../../../../styles/components/Common/List/ListNodes.module.scss';

type AddByRSSAlbumNodesProps = {
  feeds: AddByRSSFeedRecord[];
  viewSelected: ViewSelectedOption;
};

export const AddByRSSAlbumNodes: React.FC<AddByRSSAlbumNodesProps> = ({ feeds, viewSelected }) => {
  if (viewSelected === 'rows') {
    return (
      <div key="list" className={styles.listTight}>
        {feeds.map((feed, idx) => (
          <React.Fragment key={feed.idText}>
            <AddByRSSAlbumRow feed={feed} />
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
          <AddByRSSAlbumGridNode key={feed.idText} feed={feed} />
        ))}
      </div>
    );
  }

  return null;
};
