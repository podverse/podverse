'use client';

import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import React from 'react';

import {
  buildDTOChannelImageLoadCandidates,
  formatDateAbbrev,
  prependDistinctImageCandidate,
} from '@podverse/helpers';
import {
  DescriptionRenderer,
  MainColumnStack,
  MainHeader,
  MainSidebarLayout,
  SideContent,
  SkeletonFlashImage,
} from '@podverse/ui';

import { AddByRSSAlbumPageClient } from '../../../app/add-by-rss/album/AddByRSSAlbumPageClient';
import { AddByRSSPodcastPageDetailClient } from '../../../app/add-by-rss/podcast/AddByRSSPodcastPageDetailClient';
import { IMAGES } from '../../../constants/images';
import { useAccount } from '../../../contexts/Account';
import { getAddByRSSFeedByIdText } from '../../../utils/addByRSS/storage';
import { syncAddByRSSCacheWithServer } from '../../../utils/addByRSS/sync';
import type {
  AddByRSSFeedRecord,
  AddByRSSMappedFeed,
  AddByRSSResourceType,
} from '../../../utils/addByRSS/types';
import { DetailListWrapper } from '../../List/DetailListWrapper';
import { WebLoadingYourContentSpinnerOverlay } from '../../LoadingSpinner/WebLoadingSpinnerOverlay';
import { MainWrapper } from '../../Main/MainWrapper';
import { NoResults } from '../../NoResults/NoResults';
import { AddByRSSArtistHeader } from '../Artist/AddByRSSArtistHeader';
import { AddByRSSTrackHeader } from '../Artist/Album/Track/AddByRSSTrackHeader';
import { AddByRSSLivestreamHeader } from '../Livestream/AddByRSSLivestreamHeader';

import styles from '../../../styles/components/AddByRSS/Detail/AddByRSSDetail.module.scss';

type AddByRSSDetailClientProps = {
  resourceType: AddByRSSResourceType;
  idText: string;
};

export const AddByRSSDetailClient: React.FC<AddByRSSDetailClientProps> = ({
  resourceType,
  idText,
}) => {
  const tFeatures = useTranslations('features');
  const tMedia = useTranslations('media');
  const locale = useLocale();
  const router = useRouter();
  const { loggedInAccount } = useAccount();
  const [feed, setFeed] = React.useState<AddByRSSFeedRecord | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const isEpisodesDetail = resourceType === 'episodes';

  React.useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      if (!loggedInAccount) {
        setFeed(null);
        setIsLoading(false);
        return;
      }
      await syncAddByRSSCacheWithServer(loggedInAccount.id_text);
      const record = await getAddByRSSFeedByIdText(idText);
      setFeed(record);
      setIsLoading(false);
    };

    void load();
  }, [idText, loggedInAccount]);

  React.useEffect(() => {
    if (isEpisodesDetail && feed) {
      router.replace(`/add-by-rss/podcast/${feed.idText}`);
    }
  }, [isEpisodesDetail, feed, router]);

  if (isLoading) {
    return <WebLoadingYourContentSpinnerOverlay isLoading />;
  }

  if (!feed) {
    return (
      <>
        <MainHeader title={tFeatures('add_by_rss.label')} />
        <MainWrapper>
          <MainSidebarLayout>
            <SideContent />
            <MainColumnStack>
              <NoResults message={tFeatures('add_by_rss.feed_not_found_local')} />
            </MainColumnStack>
          </MainSidebarLayout>
        </MainWrapper>
      </>
    );
  }

  if (resourceType === 'podcasts') {
    return <AddByRSSPodcastPageDetailClient feed={feed} />;
  }
  if (resourceType === 'albums') {
    return <AddByRSSAlbumPageClient feed={feed} />;
  }
  if (resourceType === 'episodes') {
    return <WebLoadingYourContentSpinnerOverlay isLoading />;
  }

  const mappedFeed = feed.mappedFeed;
  const mappedChannel = mappedFeed?.channel;
  const feedTitle = mappedChannel?.channel?.title ?? feed.title ?? feed.feedUrl;
  const channelImages = mappedChannel?.images;
  const feedImageCandidates = prependDistinctImageCandidate(
    feed.imageUrl,
    buildDTOChannelImageLoadCandidates(
      channelImages,
      IMAGES.LIST.PODCASTS.SIZE_FIND_TARGET,
      'lesser'
    )
  );
  const feedDescription = mappedChannel?.description?.value ?? null;
  const items: AddByRSSMappedFeed['items'] = mappedFeed?.items ?? [];
  const itemsLabel = (() => {
    switch (resourceType) {
      case 'artists':
        return tMedia('music.artists');
      case 'tracks':
        return tMedia('music.tracks');
      case 'livestreams':
        return tMedia('livestream.livestreams');
      default:
        return tMedia('podcast.episodes');
    }
  })();
  const statusLabel = feed.status ? tFeatures(`add_by_rss.status_${feed.status}`) : undefined;
  const headerNode =
    resourceType === 'artists' ? (
      <AddByRSSArtistHeader feed={feed} />
    ) : resourceType === 'livestreams' ? (
      <AddByRSSLivestreamHeader feed={feed} />
    ) : resourceType === 'tracks' ? (
      <AddByRSSTrackHeader feed={feed} />
    ) : null;

  return (
    <>
      <MainHeader title={`${tFeatures('add_by_rss.label')} · ${feedTitle}`} />
      <MainWrapper>
        <MainSidebarLayout>
          <SideContent />
          <MainColumnStack>
            {headerNode ?? (
              <section className={styles.feedHeader}>
                <SkeletonFlashImage
                  candidates={feedImageCandidates}
                  alt={feedTitle || tMedia('podcast.podcast_image')}
                  width={IMAGES.LIST.PODCASTS.SIZE}
                  height={IMAGES.LIST.PODCASTS.SIZE}
                  className={styles.feedImage}
                />
                <div className={styles.feedMeta}>
                  <h2 className={styles.feedTitle}>{feedTitle}</h2>
                  <p className={styles.feedUrl}>{feed.feedUrl}</p>
                  <p className={styles.feedResource}>
                    {tFeatures('add_by_rss.label')} · {resourceType}
                  </p>
                  {feed.status && (
                    <p className={styles.feedStatus}>
                      {tFeatures('add_by_rss.status')}: {statusLabel ?? feed.status}
                    </p>
                  )}
                </div>
              </section>
            )}

            {feedDescription && (
              <section className={styles.feedDescription}>
                <DescriptionRenderer description={feedDescription} />
              </section>
            )}

            <DetailListWrapper>
              <section className={styles.items}>
                <h3 className={styles.itemsHeader}>{itemsLabel}</h3>
                {items.length === 0 ? (
                  <p className={styles.emptyItems}>{tFeatures('add_by_rss.no_feeds')}</p>
                ) : (
                  <ul className={styles.itemsList}>
                    {items.map((bundle, index) => (
                      <li
                        key={bundle.item.guid ?? `${index}-${feed.idText}`}
                        className={styles.item}
                      >
                        <div className={styles.itemTitle}>{bundle.item.title}</div>
                        {bundle.item.pub_date && (
                          <div className={styles.itemDate}>
                            {formatDateAbbrev(bundle.item.pub_date, locale)}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </DetailListWrapper>
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </>
  );
};
