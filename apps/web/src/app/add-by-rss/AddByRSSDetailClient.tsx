'use client';

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { formatDateAbbrev } from '@podverse/helpers';

import { MainHeader } from '../../components/Main/MainHeader';
import { MainWrapper } from '../../components/Main/MainWrapper';
import { MainInnerWrapper } from '../../components/Main/MainInnerWrapper';
import { MainInnerContentWrapper } from '../../components/Main/MainInnerContentWrapper';
import { Image } from '../../components/Image/Image';
import { DescriptionRenderer } from '../../components/Description/DescriptionRenderer';
import { NoResults } from '../../components/NoResults/NoResults';
import { SideContent } from '../../components/SideContent/SideContent';
import LoadingSpinnerOverlay from '../../components/LoadingSpinner/LoadingSpinnerOverlay';
import { IMAGES } from '../../constants/images';
import styles from '../../styles/app/add-by-rss/AddByRSSDetail.module.scss';
import { getAddByRSSFeedByIdText } from '../../utils/addByRSS/storage';
import type {
  AddByRSSFeedRecord,
  AddByRSSMappedFeed,
  AddByRSSResourceType,
} from '../../utils/addByRSS/types';

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
  const [feed, setFeed] = React.useState<AddByRSSFeedRecord | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const record = await getAddByRSSFeedByIdText(idText);
      setFeed(record);
      setIsLoading(false);
    };

    void load();
  }, [idText]);

  if (isLoading) {
    return (
      <>
        <MainHeader title={tFeatures('add_by_rss.label')} />
        <MainWrapper>
          <MainInnerWrapper>
            <SideContent />
            <MainInnerContentWrapper>
              <LoadingSpinnerOverlay isLoading />
            </MainInnerContentWrapper>
          </MainInnerWrapper>
        </MainWrapper>
      </>
    );
  }

  if (!feed) {
    return (
      <>
        <MainHeader title={tFeatures('add_by_rss.label')} />
        <MainWrapper>
          <MainInnerWrapper>
            <SideContent />
            <MainInnerContentWrapper>
              <NoResults message={tFeatures('add_by_rss.no_feeds')} />
            </MainInnerContentWrapper>
          </MainInnerWrapper>
        </MainWrapper>
      </>
    );
  }

  const mappedFeed = feed.mappedFeed;
  const mappedChannel = mappedFeed?.channel;
  const feedTitle = mappedChannel?.channel?.title ?? feed.title ?? feed.feedUrl;
  const feedImageUrl = feed.imageUrl ?? mappedChannel?.images?.[0]?.url ?? undefined;
  const feedDescription = mappedChannel?.description?.value ?? null;
  const items: AddByRSSMappedFeed['items'] = mappedFeed?.items ?? [];
  const itemsLabel = (() => {
    switch (resourceType) {
      case 'podcasts':
      case 'episodes':
        return tMedia('podcast.episodes');
      case 'artists':
        return tMedia('music.artists');
      case 'albums':
        return tMedia('music.albums');
      case 'tracks':
        return tMedia('music.tracks');
      case 'livestreams':
        return tMedia('livestream.livestreams');
      default:
        return tMedia('podcast.episodes');
    }
  })();
  const statusLabel = feed.status ? tFeatures(`add_by_rss.status_${feed.status}`) : undefined;

  return (
    <>
      <MainHeader title={`${tFeatures('add_by_rss.label')} · ${feedTitle}`} />
      <MainWrapper>
        <MainInnerWrapper>
          <SideContent />
          <MainInnerContentWrapper>
            <section className={styles.feedHeader}>
              <Image
                src={feedImageUrl}
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

            {feedDescription && (
              <section className={styles.feedDescription}>
                <DescriptionRenderer description={feedDescription} />
              </section>
            )}

            <section className={styles.items}>
              <h3 className={styles.itemsHeader}>{itemsLabel}</h3>
              {items.length === 0 ? (
                <p className={styles.emptyItems}>{tFeatures('add_by_rss.no_feeds')}</p>
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
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    </>
  );
};
