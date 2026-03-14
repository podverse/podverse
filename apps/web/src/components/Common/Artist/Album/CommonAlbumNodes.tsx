'use client';

import React from 'react';

import { Divider } from '../../../Divider/Divider';
import type { ViewSelectedOption } from '../../../ViewSelector/ViewSelector';
import { CommonAlbumListGridNode } from './CommonAlbumGridNode';
import { CommonAlbumListRow } from './CommonAlbumRow';
import type { AlbumListItem } from './types';

import styles from '../../../../styles/components/Common/List/ListNodes.module.scss';

type CommonAlbumListNodesProps = {
  items: AlbumListItem[];
  viewSelected: ViewSelectedOption;
};

export const CommonAlbumListNodes: React.FC<CommonAlbumListNodesProps> = ({
  items,
  viewSelected,
}) => {
  if (viewSelected === 'rows') {
    return (
      <div key="list" className={styles.listTight}>
        {items.map((item, idx) => (
          <React.Fragment key={item.id}>
            <CommonAlbumListRow item={item} />
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
          <CommonAlbumListGridNode key={item.id} item={item} />
        ))}
      </div>
    );
  }

  return null;
};
