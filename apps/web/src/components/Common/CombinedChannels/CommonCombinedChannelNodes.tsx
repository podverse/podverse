'use client';

import React from 'react';

import { Divider } from '@podverse/ui';

import type { ViewSelectedOption } from '../../ViewSelector/ViewSelector';
import type { CombinedChannelListItem } from './types';

import styles from '../../../styles/components/Common/List/ListNodes.module.scss';

type CommonCombinedChannelNodesProps = {
  items: CombinedChannelListItem[];
  viewSelected: ViewSelectedOption;
};

export const CommonCombinedChannelNodes: React.FC<CommonCombinedChannelNodesProps> = ({
  items,
  viewSelected,
}) => {
  if (viewSelected === 'rows') {
    return (
      <div key="list" className={styles.listTight}>
        {items.map((item, idx) => (
          <React.Fragment key={item.id}>
            {item.rowNode}
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
          <React.Fragment key={item.id}>{item.gridNode}</React.Fragment>
        ))}
      </div>
    );
  }

  return null;
};
