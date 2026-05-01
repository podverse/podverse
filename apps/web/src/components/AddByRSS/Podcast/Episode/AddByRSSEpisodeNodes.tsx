'use client';

import React, { useMemo } from 'react';

import { MediumEnum } from '@podverse/helpers';
import { getAddByRSSHashId, getItemMediumIdFromBundle } from '@podverse/parser-mapping';

import type { AddByRSSListSortOrder } from '../../../../contexts/AddByRSSListContext';
import { useLikesAddByRssBatch } from '../../../../hooks/useLikesAddByRssBatch';
import type {
  AddByRSSFeedRecord,
  AddByRSSItemIndexItem,
  AddByRSSMappedFeed,
} from '../../../../utils/addByRSS/types';
import { buildListLikeRow } from '../../../../utils/likes/buildListLikeRow';
import { Divider } from '../../../Divider/Divider';
import type { ViewSelectedOption } from '../../../ViewSelector/ViewSelector';
import { AddByRSSEpisodeGridNode } from './AddByRSSEpisodeGridNode';
import { AddByRSSEpisodeRow } from './AddByRSSEpisodeRow';

import styles from '../../../../styles/components/Common/List/ListNodes.module.scss';

type AddByRSSEpisodeNodesFeedsProps = {
  feeds: AddByRSSFeedRecord[];
  viewSelected: ViewSelectedOption;
  itemIdTextMap?: Map<string, string>;
};

type AddByRSSEpisodeNodesItemsProps = {
  channelIdText: string;
  channelTitle: string;
  channelImageUrl?: string;
  items: AddByRSSMappedFeed['items'];
  viewSelected?: ViewSelectedOption;
  itemIdTextMap: Map<string, string>;
  mediumId?: number | null;
  sortOrder?: AddByRSSListSortOrder;
};

type AddByRSSEpisodeNodesProps = AddByRSSEpisodeNodesFeedsProps | AddByRSSEpisodeNodesItemsProps;

function isFeedsProps(props: AddByRSSEpisodeNodesProps): props is AddByRSSEpisodeNodesFeedsProps {
  return 'feeds' in props;
}

type AddByRSSEpisodeItemsRowsProps = {
  channelIdText: string;
  channelTitle: string;
  channelImageUrl?: string;
  items: AddByRSSMappedFeed['items'];
  itemIdTextMap: Map<string, string>;
  mediumId: number;
  sortOrder: AddByRSSListSortOrder;
};

const AddByRSSEpisodeItemsListView: React.FC<AddByRSSEpisodeItemsRowsProps> = ({
  channelIdText,
  channelTitle,
  channelImageUrl,
  items,
  itemIdTextMap,
  mediumId,
  sortOrder,
}) => {
  const addByRssLikeRows = useMemo(() => {
    return items.map((bundle, idx) => {
      const itemGuid = bundle.item?.guid ?? `${channelIdText}-${idx}`;
      const itemIdText = getItemIdText(itemIdTextMap, channelIdText, itemGuid);
      const pubDateMs = bundle.item?.pub_date ? new Date(bundle.item.pub_date).getTime() : 0;
      const indexItem: AddByRSSItemIndexItem = {
        id: `${channelIdText}-${itemGuid}`,
        idText: itemIdText,
        itemGuid,
        channelIdText,
        channelTitle,
        channelImageUrl,
        mediumId: getItemMediumIdFromBundle(bundle, mediumId),
        bundle,
        pubDateMs,
      };
      return { hashId: getAddByRSSHashId(indexItem), indexItem };
    });
  }, [channelIdText, channelImageUrl, channelTitle, itemIdTextMap, items, mediumId]);

  const { isLiked, toggle } = useLikesAddByRssBatch(addByRssLikeRows);
  const itemIdTexts = items.map((bundle, i) => {
    const itemGuid = bundle.item?.guid ?? `${channelIdText}-${i}`;
    return getItemIdText(itemIdTextMap, channelIdText, itemGuid);
  });

  return (
    <div key="list" className={styles.list}>
      {items.map((bundle, idx) => {
        const itemGuid = bundle.item?.guid ?? `${channelIdText}-${idx}`;
        const itemIdText = getItemIdText(itemIdTextMap, channelIdText, itemGuid);
        const pubDateMs = bundle.item?.pub_date ? new Date(bundle.item.pub_date).getTime() : 0;
        const indexItem: AddByRSSItemIndexItem = {
          id: `${channelIdText}-${itemGuid}`,
          idText: itemIdText,
          itemGuid,
          channelIdText,
          channelTitle,
          channelImageUrl,
          mediumId: getItemMediumIdFromBundle(bundle, mediumId),
          bundle,
          pubDateMs,
        };
        const hashId = getAddByRSSHashId(indexItem);
        return (
          <React.Fragment key={bundle.item?.guid ?? idx}>
            <AddByRSSEpisodeRow
              itemIdText={itemIdText}
              channelTitle={channelTitle}
              channelImageUrl={channelImageUrl}
              bundle={bundle}
              indexItem={indexItem}
              listContext={{
                feedIdText: channelIdText,
                itemIdTexts,
                currentIndex: idx,
                sortOrder,
              }}
              likeRow={buildListLikeRow(hashId, { isLiked, toggle })}
            />
            {idx < items.length - 1 && <Divider />}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const getItemIdText = (
  map: Map<string, string> | undefined,
  channelIdText: string,
  itemGuid: string
): string => {
  const compositeId = `${channelIdText}-${itemGuid}`;
  return map?.get(compositeId) ?? '';
};

export const AddByRSSEpisodeNodes: React.FC<AddByRSSEpisodeNodesProps> = (props) => {
  if (isFeedsProps(props)) {
    const { feeds, viewSelected, itemIdTextMap } = props;
    if (viewSelected === 'rows') {
      return (
        <div key="list" className={styles.list}>
          {feeds.map((feed, idx) => {
            const itemGuid = feed.mappedFeed?.items?.[0]?.item?.guid ?? feed.idText;
            const itemIdText = getItemIdText(itemIdTextMap, feed.idText, itemGuid);
            return (
              <React.Fragment key={feed.idText}>
                <AddByRSSEpisodeRow
                  itemIdText={itemIdText}
                  channelTitle={
                    feed.mappedFeed?.channel?.channel?.title ?? feed.title ?? feed.feedUrl
                  }
                  channelImageUrl={feed.imageUrl ?? feed.mappedFeed?.channel?.images?.[0]?.url}
                  bundle={
                    feed.mappedFeed?.items?.[0] ?? ({} as AddByRSSMappedFeed['items'][number])
                  }
                />
                {idx < feeds.length - 1 && <Divider />}
              </React.Fragment>
            );
          })}
        </div>
      );
    }
    if (viewSelected === 'grid') {
      return (
        <div key="grid" className={styles.grid}>
          {feeds.map((feed) => (
            <AddByRSSEpisodeGridNode key={feed.idText} feed={feed} />
          ))}
        </div>
      );
    }
    return null;
  }

  const {
    channelIdText,
    channelTitle,
    channelImageUrl,
    items,
    viewSelected = 'rows',
    itemIdTextMap,
    mediumId = MediumEnum.Podcast,
    sortOrder = 'recent',
  } = props;
  if (viewSelected === 'rows') {
    return (
      <AddByRSSEpisodeItemsListView
        channelIdText={channelIdText}
        channelTitle={channelTitle}
        channelImageUrl={channelImageUrl}
        items={items}
        itemIdTextMap={itemIdTextMap}
        mediumId={mediumId ?? MediumEnum.Podcast}
        sortOrder={sortOrder}
      />
    );
  }
  if (viewSelected === 'grid') {
    return (
      <div key="grid" className={styles.grid}>
        {items.map((bundle, idx) => (
          <AddByRSSEpisodeGridNode
            key={bundle.item?.guid ?? idx}
            feed={
              {
                idText: channelIdText,
                title: channelTitle,
                feedUrl: '',
                imageUrl: channelImageUrl,
                mappedFeed: {
                  channel: {
                    channel: { title: channelTitle },
                    images: [],
                    about: {},
                    funding: [],
                    value: [],
                  },
                  items: [bundle],
                },
              } as unknown as AddByRSSFeedRecord
            }
          />
        ))}
      </div>
    );
  }
  return null;
};
