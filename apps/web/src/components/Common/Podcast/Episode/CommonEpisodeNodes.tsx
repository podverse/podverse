'use client';

import React from 'react';

import type { DTOChannel, DTOItem } from '@podverse/helpers';
import { Divider } from '@podverse/ui';

import { ListLiveItemRow } from '../../../List/LiveItem/ListLiveItemRow';
import { CommonEpisodeListGridNode } from './CommonEpisodeGridNode';
import { CommonEpisodeListRow } from './CommonEpisodeRow';
import type { EpisodeListNodesProps } from './types';

import styles from '../../../../styles/components/Common/List/ListNodes.module.scss';

export const CommonEpisodeListNodes: React.FC<EpisodeListNodesProps> = ({
  channel,
  items,
  viewSelected,
  showChannelInfo,
}) => {
  const filteredItems = items.filter((item): item is DTOItem & { channel: DTOChannel } =>
    channel ? true : !!item.channel
  );

  if (viewSelected === 'rows') {
    return (
      <div key="list" className={styles.list}>
        {filteredItems.map((item, idx) => {
          const rowChannel = channel || item.channel;
          return (
            <React.Fragment key={item.id}>
              {item.live_item ? (
                <ListLiveItemRow
                  channel={rowChannel}
                  item={item}
                  live_item={item.live_item}
                  showChannelInfo={showChannelInfo}
                  showLiveItemStatus
                />
              ) : (
                <CommonEpisodeListRow
                  channel={rowChannel}
                  item={item}
                  showChannelInfo={showChannelInfo}
                  playlist_id_text={null}
                />
              )}
              {idx < items.length - 1 && <Divider />}
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  if (viewSelected === 'grid') {
    return (
      <div key="grid" className={styles.grid}>
        {filteredItems.map((item) => {
          const rowChannel = channel || item.channel;
          return (
            <CommonEpisodeListGridNode
              key={item.id}
              channel={rowChannel}
              item={item}
              showChannelInfo={showChannelInfo}
            />
          );
        })}
      </div>
    );
  }

  return null;
};
