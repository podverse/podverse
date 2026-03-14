'use client';

import React from 'react';

import { Divider } from '../../Divider/Divider';
import type { ViewSelectedOption } from '../../ViewSelector/ViewSelector';
import { CommonPodcastListGridNode } from './CommonPodcastGridNode';
import { CommonPodcastListRow } from './CommonPodcastRow';
import type { PodcastListItem } from './types';

import styles from '../../../styles/components/Common/List/ListNodes.module.scss';

type CommonPodcastListNodesProps = {
  items: PodcastListItem[];
  viewSelected: ViewSelectedOption;
};

export const CommonPodcastListNodes: React.FC<CommonPodcastListNodesProps> = ({
  items,
  viewSelected,
}) => {
  if (viewSelected === 'rows') {
    return (
      <div key="list" className={styles.listTight}>
        {items.map((item, idx) => (
          <React.Fragment key={item.id}>
            <CommonPodcastListRow item={item} />
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
          <CommonPodcastListGridNode key={item.id} item={item} />
        ))}
      </div>
    );
  }

  return null;
};
