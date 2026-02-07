'use client';

import React from 'react';

import { Divider } from '../../../../Divider/Divider';
import type { ViewSelectedOption } from '../../../../ViewSelector/ViewSelector';
import type { AddByRSSMappedFeed } from '../../../../../utils/addByRSS/types';
import { AddByRSSTrackRow } from './AddByRSSTrackRow';
import { AddByRSSTrackGridCard } from './AddByRSSTrackGridCard';
import styles from '../../../../../styles/components/Common/List/ListNodes.module.scss';

type AddByRSSAlbumTrackNodesProps = {
  channelIdText: string;
  channelTitle: string;
  channelImageUrl?: string;
  items: AddByRSSMappedFeed['items'];
  viewSelected?: ViewSelectedOption;
  itemIdTextMap: Map<string, string>;
};

const getItemIdText = (
  map: Map<string, string>,
  channelIdText: string,
  itemGuid: string
): string => {
  const compositeId = `${channelIdText}-${itemGuid}`;
  return map.get(compositeId) ?? '';
};

export const AddByRSSAlbumTrackNodes: React.FC<AddByRSSAlbumTrackNodesProps> = ({
  channelIdText,
  channelTitle,
  channelImageUrl,
  items,
  viewSelected = 'rows',
  itemIdTextMap,
}) => {
  if (viewSelected === 'rows') {
    return (
      <div key="list" className={styles.list}>
        {items.map((bundle, idx) => {
          const itemGuid = bundle.item?.guid ?? `${channelIdText}-${idx}`;
          const itemIdText = getItemIdText(itemIdTextMap, channelIdText, itemGuid);
          return (
            <React.Fragment key={bundle.item?.guid ?? idx}>
              <AddByRSSTrackRow
                itemIdText={itemIdText}
                channelTitle={channelTitle}
                channelImageUrl={channelImageUrl}
                bundle={bundle}
              />
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
        {items.map((bundle, idx) => {
          const itemGuid = bundle.item?.guid ?? `${channelIdText}-${idx}`;
          const itemIdText = getItemIdText(itemIdTextMap, channelIdText, itemGuid);
          return (
            <AddByRSSTrackGridCard
              key={bundle.item?.guid ?? idx}
              item={{
                id: `${channelIdText}-${itemGuid}`,
                idText: itemIdText,
                itemGuid,
                channelIdText,
                channelTitle,
                channelImageUrl,
                mediumId: null,
                bundle,
                pubDateMs: bundle.item?.pub_date ? new Date(bundle.item.pub_date).getTime() : 0,
              }}
              showChannelInfo={false}
            />
          );
        })}
      </div>
    );
  }
  return null;
};
