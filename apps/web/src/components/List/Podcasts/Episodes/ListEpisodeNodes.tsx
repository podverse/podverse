'use client';

import React, { useMemo } from 'react';

import type { DTOChannel, DTOItem } from '@podverse/helpers';
import { Divider } from '@podverse/ui';

import { useLikesItemBatch } from '../../../../hooks/useLikesItemBatch';
import { buildListLikeRow } from '../../../../utils/likes/buildListLikeRow';
import type { ViewSelectedOption } from '../../../ViewSelector/ViewSelector';
import { ListLiveItemRow } from '../../LiveItem/ListLiveItemRow';
import { ListEpisodeGridNode } from './ListEpisodeGridNode';
import { ListEpisodeRow } from './ListEpisodeRow';

import styles from '../../../../styles/components/Common/List/ListNodes.module.scss';

interface Params {
  channel: DTOChannel | null;
  items: DTOItem[];
  viewSelected: ViewSelectedOption;
  showChannelInfo?: boolean;
}

export function ListEpisodeNodes({
  channel,
  items,
  viewSelected,
  showChannelInfo,
}: Params): React.ReactNode {
  const filteredItems = items.filter((item): item is DTOItem & { channel: DTOChannel } =>
    channel ? true : !!item.channel
  );

  const likeableIdTexts = useMemo(
    () => filteredItems.filter((i) => !i.live_item).map((i) => i.id_text),
    [filteredItems]
  );
  const { isLiked, toggle } = useLikesItemBatch(likeableIdTexts);

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
                <ListEpisodeRow
                  channel={rowChannel}
                  item={item}
                  showChannelInfo={showChannelInfo}
                  playlist_id_text={null}
                  likeRow={buildListLikeRow(item.id_text, { isLiked, toggle })}
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
            <ListEpisodeGridNode
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
}
