'use client';

import React from 'react';

import { Divider } from '../../../Divider/Divider';
import type { ViewSelectedOption } from '../../../ViewSelector/ViewSelector';
import styles from '../../../../styles/components/Common/List/ListNodes.module.scss';
import type { AddByRSSFeedRecord, AddByRSSMappedFeed } from '../../../../utils/addByRSS/types';
import { AddByRSSEpisodeGridNode } from './AddByRSSEpisodeGridNode';
import { AddByRSSEpisodeRow } from './AddByRSSEpisodeRow';

type AddByRSSEpisodeNodesFeedsProps = {
  feeds: AddByRSSFeedRecord[];
  viewSelected: ViewSelectedOption;
};

type AddByRSSEpisodeNodesItemsProps = {
  feedIdText: string;
  feedTitle: string;
  feedImageUrl?: string;
  items: AddByRSSMappedFeed['items'];
  viewSelected?: ViewSelectedOption;
};

type AddByRSSEpisodeNodesProps = AddByRSSEpisodeNodesFeedsProps | AddByRSSEpisodeNodesItemsProps;

function isFeedsProps(props: AddByRSSEpisodeNodesProps): props is AddByRSSEpisodeNodesFeedsProps {
  return 'feeds' in props;
}

export const AddByRSSEpisodeNodes: React.FC<AddByRSSEpisodeNodesProps> = (props) => {
  if (isFeedsProps(props)) {
    const { feeds, viewSelected } = props;
    if (viewSelected === 'rows') {
      return (
        <div key="list" className={styles.list}>
          {feeds.map((feed, idx) => (
            <React.Fragment key={feed.idText}>
              <AddByRSSEpisodeRow
                itemGuid={feed.mappedFeed?.items?.[0]?.item?.guid ?? feed.idText}
                feedTitle={feed.mappedFeed?.channel?.channel?.title ?? feed.title ?? feed.feedUrl}
                feedImageUrl={feed.imageUrl ?? feed.mappedFeed?.channel?.images?.[0]?.url}
                bundle={feed.mappedFeed?.items?.[0] ?? ({} as AddByRSSMappedFeed['items'][number])}
              />
              {idx < feeds.length - 1 && <Divider />}
            </React.Fragment>
          ))}
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

  const { feedIdText, feedTitle, feedImageUrl, items, viewSelected = 'rows' } = props;
  if (viewSelected === 'rows') {
    return (
      <div key="list" className={styles.list}>
        {items.map((bundle, idx) => (
          <React.Fragment key={bundle.item?.guid ?? idx}>
            <AddByRSSEpisodeRow
              itemGuid={bundle.item?.guid ?? feedIdText}
              feedTitle={feedTitle}
              feedImageUrl={feedImageUrl}
              bundle={bundle}
            />
            {idx < items.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </div>
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
                idText: feedIdText,
                title: feedTitle,
                feedUrl: '',
                imageUrl: feedImageUrl,
                mappedFeed: {
                  channel: {
                    channel: { title: feedTitle },
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
