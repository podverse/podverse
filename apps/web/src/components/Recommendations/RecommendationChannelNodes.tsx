'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import React, { useMemo } from 'react';

import { formatDateAbbrev } from '@podverse/helpers';
import type { MoreButtonMenuItem } from '@podverse/ui';
import { Divider, MoreButton, SkeletonFlashImage } from '@podverse/ui';

import { IMAGES } from '../../constants/images';
import { listItemImageCandidates } from '../../utils/image/listItemImageCandidates';
import type { ViewSelectedOption } from '../ViewSelector/ViewSelector';

import gridStyles from '../../styles/components/Common/List/ListGridNode.module.scss';
import listStyles from '../../styles/components/Common/List/ListNodes.module.scss';
import rowStyles from '../../styles/components/Common/List/Podcasts/ListPodcastRow.module.scss';
import styles from '../../styles/components/Recommendations/RecommendationChannelNodes.module.scss';

export type RecommendationChannelListItem = {
  href: string;
  id: string;
  imageCandidates: string[];
  lastPubDate?: Date | string | null;
  subtitle?: string | null;
  title: string;
};

type RecommendationChannelNodesProps = {
  items: RecommendationChannelListItem[];
  onHide: (channelIdText: string) => void;
  viewSelected: ViewSelectedOption;
};

export const RecommendationChannelNodes: React.FC<RecommendationChannelNodesProps> = ({
  items,
  onHide,
  viewSelected,
}) => {
  if (viewSelected === 'rows') {
    return (
      <div key="list" className={listStyles.listTight}>
        {items.map((item, idx) => (
          <React.Fragment key={item.id}>
            <RecommendationChannelRow item={item} onHide={onHide} />
            {idx < items.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </div>
    );
  }

  if (viewSelected === 'grid') {
    return (
      <div key="grid" className={listStyles.grid}>
        {items.map((item) => (
          <RecommendationChannelGridNode key={item.id} item={item} onHide={onHide} />
        ))}
      </div>
    );
  }

  return null;
};

function useHideMenuItems(
  item: RecommendationChannelListItem,
  onHide: (channelIdText: string) => void
): MoreButtonMenuItem[] {
  const t = useTranslations('features.recommendations');
  return useMemo(
    () => [
      {
        label: t('hide'),
        onClick: () => {
          onHide(item.id);
        },
      },
    ],
    [item.id, onHide, t]
  );
}

const RecommendationChannelRow: React.FC<{
  item: RecommendationChannelListItem;
  onHide: (channelIdText: string) => void;
}> = ({ item, onHide }) => {
  const tMedia = useTranslations('media');
  const locale = useLocale();
  const moreButtonMenuItems = useHideMenuItems(item, onHide);
  const subtitle = item.subtitle?.trim() || null;

  return (
    <div className={styles.row}>
      <Link href={item.href} className={rowStyles.link}>
        <div className={rowStyles.listItem}>
          <div className={rowStyles.artwork}>
            <SkeletonFlashImage
              candidates={listItemImageCandidates(item)}
              alt={item.title || tMedia('podcast.podcast_image')}
              width={IMAGES.LIST.PODCASTS.SIZE}
              height={IMAGES.LIST.PODCASTS.SIZE}
              className={rowStyles.image}
            />
          </div>
          <div className={rowStyles.content}>
            <h3 className={rowStyles.title}>{item.title}</h3>
            {subtitle ? <span className={rowStyles.lastPubDate}>{subtitle}</span> : null}
            {!subtitle && item.lastPubDate ? (
              <span className={rowStyles.lastPubDate}>
                {formatDateAbbrev(item.lastPubDate, locale)}
              </span>
            ) : null}
          </div>
        </div>
      </Link>
      <MoreButton ariaLabel={tMedia('more_options')} moreButtonMenuItems={moreButtonMenuItems} />
    </div>
  );
};

const RecommendationChannelGridNode: React.FC<{
  item: RecommendationChannelListItem;
  onHide: (channelIdText: string) => void;
}> = ({ item, onHide }) => {
  const tMedia = useTranslations('media');
  const locale = useLocale();
  const moreButtonMenuItems = useHideMenuItems(item, onHide);
  const subtitle = item.subtitle?.trim() || null;

  return (
    <div className={styles.gridNode}>
      <Link href={item.href} className={gridStyles.link}>
        <div className={gridStyles.gridNode}>
          <SkeletonFlashImage
            candidates={listItemImageCandidates(item)}
            alt={item.title || tMedia('podcast.podcast_image')}
            width={IMAGES.LIST.GRID.SIZE}
            height={IMAGES.LIST.GRID.SIZE}
            className={gridStyles.image}
          />
          <div className={gridStyles.title}>{item.title}</div>
          {subtitle ? <span className={gridStyles.lastPubDate}>{subtitle}</span> : null}
          {!subtitle && item.lastPubDate ? (
            <span className={gridStyles.lastPubDate}>
              {formatDateAbbrev(item.lastPubDate, locale)}
            </span>
          ) : null}
        </div>
      </Link>
      <div className={styles.gridMore}>
        <MoreButton ariaLabel={tMedia('more_options')} moreButtonMenuItems={moreButtonMenuItems} />
      </div>
    </div>
  );
};
