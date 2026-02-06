'use client';

import React from 'react';
import { useTranslations } from 'next-intl';

import { MainWrapper } from '../../../components/Main/MainWrapper';
import { MainInnerWrapper } from '../../../components/Main/MainInnerWrapper';
import { MainInnerContentWrapper } from '../../../components/Main/MainInnerContentWrapper';
import { SideContent } from '../../../components/SideContent/SideContent';
import { DetailListWrapper } from '../../../components/List/DetailListWrapper';
import LoadingSpinnerOverlay from '../../../components/LoadingSpinner/LoadingSpinnerOverlay';
import { NoResults } from '../../../components/NoResults/NoResults';
import { CoreEpisodeSummary } from '../../../components/Core/Podcast/Episodes/CoreEpisodeSummary';
import { CommonDetailListHeader } from '../../../components/Common/List/CommonDetailListHeader';
import { Tabs } from '../../../components/Tabs/Tabs';
import { AddByRSSPodcastHeader } from '../../../components/AddByRSS/Podcast/AddByRSSPodcastHeader';
import { AddByRSSAlbumHeader } from '../../../components/AddByRSS/Artist/Album/AddByRSSAlbumHeader';
import { AddByRSSArtistHeader } from '../../../components/AddByRSS/Artist/AddByRSSArtistHeader';
import { AddByRSSLivestreamDetailHeader } from '../../../components/AddByRSS/Livestream/AddByRSSLivestreamDetailHeader';
import { useAccount } from '../../../contexts/Account';
import { syncAddByRSSCacheWithServer } from '../../../utils/addByRSS/sync';
import {
  getAddByRSSLivestreamByIdText,
  getAddByRSSFeedByIdText,
} from '../../../utils/addByRSS/storage';
import type {
  AddByRSSFeedRecord,
  AddByRSSLivestreamIndexItem,
} from '../../../utils/addByRSS/types';

type AddByRSSLivestreamItemPageClientProps = {
  itemIdText: string;
  mediumSlug: 'podcast' | 'music';
};

export const AddByRSSLivestreamItemPageClient: React.FC<AddByRSSLivestreamItemPageClientProps> = ({
  itemIdText,
  mediumSlug,
}) => {
  const tFeatures = useTranslations('features');
  const tInfo = useTranslations('info');
  const tMisc = useTranslations('misc');
  const { loggedInAccount } = useAccount();
  const [feed, setFeed] = React.useState<AddByRSSFeedRecord | null>(null);
  const [livestream, setLivestream] = React.useState<AddByRSSLivestreamIndexItem | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);

      if (!itemIdText) {
        setLivestream(null);
        setFeed(null);
        setIsLoading(false);
        return;
      }

      if (!loggedInAccount) {
        setLivestream(null);
        setFeed(null);
        setIsLoading(false);
        return;
      }

      await syncAddByRSSCacheWithServer(loggedInAccount.id_text);
      if (cancelled) {
        return;
      }

      const found = await getAddByRSSLivestreamByIdText(itemIdText);
      if (cancelled) {
        return;
      }

      if (!found) {
        setLivestream(null);
        setFeed(null);
        setIsLoading(false);
        return;
      }

      const feedRecord = await getAddByRSSFeedByIdText(found.channelIdText);
      if (cancelled) {
        return;
      }

      setLivestream(found);
      setFeed(feedRecord);
      setIsLoading(false);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [itemIdText, loggedInAccount]);

  if (isLoading) {
    return <LoadingSpinnerOverlay isLoading message={tMisc('loading_your_content')} />;
  }

  if (!livestream || !feed) {
    return (
      <MainWrapper>
        <MainInnerWrapper>
          <SideContent />
          <MainInnerContentWrapper>
            <NoResults message={tFeatures('add_by_rss.feed_not_found_local')} />
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    );
  }

  const title = livestream.item.title ?? tInfo('livestream.livestream');
  const description = livestream.item.description ?? null;

  const tabData = [
    {
      key: 'summary',
      label: tInfo('summary.summary'),
      onClick: () => undefined,
      zIndex: 1,
    },
  ];

  const headerNode =
    feed.resourceType === 'artists' ? (
      <AddByRSSArtistHeader feed={feed} />
    ) : feed.resourceType === 'albums' ? (
      <AddByRSSAlbumHeader feed={feed} />
    ) : (
      <AddByRSSPodcastHeader feed={feed} />
    );

  return (
    <MainWrapper>
      {headerNode}
      <MainInnerWrapper>
        <SideContent />
        <MainInnerContentWrapper>
          <AddByRSSLivestreamDetailHeader
            itemIdText={livestream.idText}
            title={title}
            mediumSlug={mediumSlug}
          />
          <CommonDetailListHeader tabs={<Tabs tabData={tabData} selectedKey="summary" />} />
          <DetailListWrapper>
            {description ? <CoreEpisodeSummary description={description} /> : null}
          </DetailListWrapper>
        </MainInnerContentWrapper>
      </MainInnerWrapper>
    </MainWrapper>
  );
};
