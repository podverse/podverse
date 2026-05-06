'use client';

import React from 'react';

import { Divider } from '@podverse/ui';

import type { ViewSelectedOption } from '../../ViewSelector/ViewSelector';
import { CommonArtistListGridNode } from './CommonArtistGridNode';
import { CommonArtistListRow } from './CommonArtistRow';
import type { ArtistListItem } from './types';

import styles from '../../../styles/components/Common/List/ListNodes.module.scss';

type CommonArtistListNodesProps = {
  items: ArtistListItem[];
  viewSelected: ViewSelectedOption;
};

export const CommonArtistListNodes: React.FC<CommonArtistListNodesProps> = ({
  items,
  viewSelected,
}) => {
  if (viewSelected === 'rows') {
    return (
      <div key="list" className={styles.listTight}>
        {items.map((item, idx) => (
          <React.Fragment key={item.id}>
            <CommonArtistListRow item={item} />
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
          <CommonArtistListGridNode key={item.id} item={item} />
        ))}
      </div>
    );
  }

  return null;
};
