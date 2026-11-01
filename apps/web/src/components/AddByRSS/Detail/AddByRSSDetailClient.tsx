'use client';

import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import React from 'react';

import {
  buildDTOChannelImageLoadCandidates,
  formatDateAbbrev,
  isDescriptionTruncated,
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
import { useAddByRSSFeedChanged } from '../../../hooks/useAddByRSSFeedChanged';
import {
  addByRSSFeedNeedsFirstParse,
  enqueueAddByRSSFirstParses,
} from '../../../utils/addByRSS/firstParse';
import {
  getAddByRSSAlbumSourceByIdText,
  getAddByRSSFeedByIdText,
} from '../../../utils/addByRSS/storage';
import { syncAddByRSSFollowStubs } from '../../../utils/addByRSS/sync';
import type {
  AddByRSSAlbumSource,
  AddByRSSMappedFeed,
  AddByRSSResourceType,
} from '../../../utils/addByRSS/types';
import { DescriptionTruncationNotice } from '../../Content/Description/DescriptionTruncationNotice';
import { DetailListWrapper } from '../../List/DetailListWrapper';
import { WebLoadingYourContentSpinnerOverlay } from '../../LoadingSpinner/WebLoadingSpinnerOverlay';
import { MainWrapper } from '../../Main/MainWrapper';
import { NoResults } from '../../NoResults/NoResults';
import { AddByRSSArtistHeader } from '../Artist/AddByRSSArtistHeader';
import { AddByRSSTrackHeader } from '../Artist/Album/Track/AddByRSSTrackHeader';

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
  const [source, setSource] = React.useState<AddByRSSAlbumSource | null>(null);
  const feed = source?.feed ?? null;
  const [isLoading, setIsLoading] = React.useState(true);

  const isEpisodesDetail = resourceType === 'episodes';

  const accountIdText = loggedInAccount?.id_text ?? null;

  // Only albums fall back to the listed store: an Add by RSS artist lists albums, nothing else.
  const readSource = React.useCallback(
    (): Promise<AddByRSSAlbumSource | null> =>
      resourceType === 'albums'
        ? getAddByRSSAlbumSourceByIdText(idText)
        : getAddByRSSFeedByIdText(idText).then((record): AddByRSSAlbumSource | null =>
            record ? { followed: true, feed: record } : null
          ),
    [idText, resourceType]
  );

  React.useEffect(() => {
    let isCurrent = true;
    const load = async () => {
      setIsLoading(true);
      if (accountIdText === null) {
        setSource(null);
        setIsLoading(false);
        return;
      }

      // The stored record shows at once; the follow sync then brings in the server's title and
      // artwork, or removes a feed the account no longer follows.
      const local = await readSource();
      if (!isCurrent) {
        return;
      }
      if (local) {
        setSource(local);
        setIsLoading(false);
      }

      try {
        await syncAddByRSSFollowStubs(accountIdText);
      } catch (error) {
        console.error(error);
      }
      const synced = await readSource();
      if (!isCurrent) {
        return;
      }
      setSource(synced);
      setIsLoading(false);

      if (synced?.followed === true && addByRSSFeedNeedsFirstParse(synced.feed)) {
        void enqueueAddByRSSFirstParses({
          accountId: accountIdText,
          feedUrls: [synced.feed.feedUrl],
        });
      }
    };

    void load();
    return () => {
      isCurrent = false;
    };
  }, [accountIdText, readSource]);

  useAddByRSSFeedChanged(feed?.feedUrl ?? null, () => {
    void readSource().then((next) => {
      if (next) {
        setSource(next);
      }
    });
  });

  React.useEffect(() => {
    if (isEpisodesDetail && feed) {
      router.replace(`/add-by-rss/podcast/${feed.idText}`);
    }
  }, [isEpisodesDetail, feed, router]);

  if (isLoading) {
    return <WebLoadingYourContentSpinnerOverlay isLoading />;
  }

  if (source === null || feed === null) {
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
    return <AddByRSSAlbumPageClient feed={source.feed} followed={source.followed} />;
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
      default:
        return tMedia('podcast.episodes');
    }
  })();
  const emptyItemsMessage =
    resourceType === 'tracks' || resourceType === 'albums'
      ? tMedia('music.no_tracks_found')
      : resourceType === 'artists'
        ? tMedia('music.no_artists_found')
        : tMedia('podcast.no_episodes_found');
  const statusLabel = feed.status ? tFeatures(`add_by_rss.status_${feed.status}`) : undefined;
  const isAwaitingFirstItems =
    mappedFeed === undefined && (feed.status === 'queued' || feed.status === 'processing');
  const headerNode =
    resourceType === 'artists' ? (
      <AddByRSSArtistHeader feed={feed} />
    ) : resourceType === 'tracks' ? (
      <AddByRSSTrackHeader feed={feed} />
    ) : null;

  return (
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
                <h1 className={styles.feedTitle}>{feedTitle}</h1>
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
              {isDescriptionTruncated(mappedChannel?.description) ? (
                <DescriptionTruncationNotice
                  kind="channel"
                  linkUrl={mappedChannel?.about?.website_link_url}
                />
              ) : null}
            </section>
          )}

          <DetailListWrapper>
            <section className={styles.items}>
              <h3 className={styles.itemsHeader}>{itemsLabel}</h3>
              {items.length === 0 ? (
                isAwaitingFirstItems ? (
                  <p className={styles.emptyItems} role="status">
                    {`${tFeatures('add_by_rss.status')}: ${statusLabel ?? feed.status}`}
                  </p>
                ) : (
                  <NoResults message={emptyItemsMessage} role="status" />
                )
              ) : (
                <ul className={styles.itemsList}>
                  {items.map((bundle, index) => (
                    <li key={bundle.item.guid ?? `${index}-${feed.idText}`} className={styles.item}>
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
  );
};
