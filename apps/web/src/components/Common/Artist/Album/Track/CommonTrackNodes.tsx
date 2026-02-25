'use client';

import React from 'react';
import type { DTOChannel, DTOItem } from '@podverse/helpers';

import type { ViewSelectedOption } from '../../../../ViewSelector/ViewSelector';
import { Divider } from '../../../../Divider/Divider';
import { ListLiveItemRow } from '../../../../List/LiveItem/ListLiveItemRow';
import styles from '../../../../../styles/components/Common/List/ListNodes.module.scss';
import { CommonTrackListGridNode } from './CommonTrackGridNode';
import { CommonTrackListRow } from './CommonTrackListRow';

type CommonTrackListNodesProps = {
  channel: DTOChannel | null;
  items: DTOItem[];
  viewSelected: ViewSelectedOption;
  showChannelInfo?: boolean;
};

export const CommonTrackListNodes: React.FC<CommonTrackListNodesProps> = ({
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
      <div key="list" className={styles.listTracks}>
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
                <CommonTrackListRow
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
            <CommonTrackListGridNode
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
