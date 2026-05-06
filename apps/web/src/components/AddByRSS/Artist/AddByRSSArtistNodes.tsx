'use client';

import React from 'react';

import { Divider } from '@podverse/ui';

import type { AddByRSSFeedRecord } from '../../../utils/addByRSS/types';
import type { ViewSelectedOption } from '../../ViewSelector/ViewSelector';
import { AddByRSSArtistGridNode } from './AddByRSSArtistGridNode';
import { AddByRSSArtistRow } from './AddByRSSArtistRow';

import styles from '../../../styles/components/Common/List/ListNodes.module.scss';

type AddByRSSArtistNodesProps = {
  feeds: AddByRSSFeedRecord[];
  viewSelected: ViewSelectedOption;
};

export const AddByRSSArtistNodes: React.FC<AddByRSSArtistNodesProps> = ({
  feeds,
  viewSelected,
}) => {
  if (viewSelected === 'rows') {
    return (
      <div key="list" className={styles.listTight}>
        {feeds.map((feed, idx) => (
          <React.Fragment key={feed.idText}>
            <AddByRSSArtistRow feed={feed} />
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
          <AddByRSSArtistGridNode key={feed.idText} feed={feed} />
        ))}
      </div>
    );
  }

  return null;
};
