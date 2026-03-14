'use client';

import React from 'react';

import type { DTOChannel } from '@podverse/helpers';

import { Divider } from '../../../Divider/Divider';
import type { ViewSelectedOption } from '../../../ViewSelector/ViewSelector';
import { ListAlbumGridNode } from './ListAlbumGridNode';
import { ListAlbumRow } from './ListAlbumRow';

import styles from '../../../../styles/components/Common/List/ListNodes.module.scss';

interface Params {
  channels: DTOChannel[];
  viewSelected: ViewSelectedOption;
}

export function ListAlbumNodes({ channels, viewSelected }: Params): React.ReactNode {
  if (viewSelected === 'rows') {
    return (
      <div key="list" className={styles.listTight}>
        {channels.map((channel, idx) => (
          <React.Fragment key={channel.id}>
            <ListAlbumRow channel={channel} />
            {idx < channels.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </div>
    );
  }

  if (viewSelected === 'grid') {
    return (
      <div key="grid" className={styles.grid}>
        {channels.map((channel) => (
          <ListAlbumGridNode key={channel.id} channel={channel} />
        ))}
      </div>
    );
  }

  return null;
}
