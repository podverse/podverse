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
import { AddByRSSAlbumHeader } from '../../../components/AddByRSS/Artist/Album/AddByRSSAlbumHeader';
import { AddByRSSTrackDetailHeader } from '../../../components/AddByRSS/Artist/Album/Track/AddByRSSTrackDetailHeader';
import { useAccount } from '../../../contexts/Account';
import { syncAddByRSSCacheWithServer } from '../../../utils/addByRSS/sync';
import { getAddByRSSFeedByIdText, getAddByRSSItemByIdText } from '../../../utils/addByRSS/storage';
import type { AddByRSSFeedRecord, AddByRSSItemIndexItem } from '../../../utils/addByRSS/types';

type AddByRSSTrackItemPageClientProps = {
  itemIdText: string;
};

export const AddByRSSTrackItemPageClient: React.FC<AddByRSSTrackItemPageClientProps> = ({
  itemIdText,
}) => {
  const tFeatures = useTranslations('features');
  const tInfo = useTranslations('info');
  const tMisc = useTranslations('misc');
  const { loggedInAccount } = useAccount();
  const [feed, setFeed] = React.useState<AddByRSSFeedRecord | null>(null);
  const [track, setTrack] = React.useState<AddByRSSItemIndexItem | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);

      if (!itemIdText) {
        setTrack(null);
        setFeed(null);
        setIsLoading(false);
        return;
      }

      if (!loggedInAccount) {
        setTrack(null);
        setFeed(null);
        setIsLoading(false);
        return;
      }

      await syncAddByRSSCacheWithServer(loggedInAccount.id_text);
      if (cancelled) {
        return;
      }

      const found = await getAddByRSSItemByIdText(itemIdText);
      if (cancelled) {
        return;
      }

      if (!found) {
        setTrack(null);
        setFeed(null);
        setIsLoading(false);
        return;
      }

      const feedRecord = await getAddByRSSFeedByIdText(found.channelIdText);
      if (cancelled) {
        return;
      }

      setTrack(found);
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

  if (!track || !feed) {
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

  const title = track.bundle.item.title ?? tInfo('track.track');
  const description = track.bundle.description?.value ?? null;

  const tabData = [
    {
      key: 'summary',
      label: tInfo('summary.summary'),
      onClick: () => undefined,
      zIndex: 1,
    },
  ];

  return (
    <MainWrapper>
      <AddByRSSAlbumHeader feed={feed} />
      <MainInnerWrapper>
        <SideContent />
        <MainInnerContentWrapper>
          <AddByRSSTrackDetailHeader itemIdText={track.idText} title={title} indexItem={track} />
          <CommonDetailListHeader tabs={<Tabs tabData={tabData} selectedKey="summary" />} />
          <DetailListWrapper>
            {description ? <CoreEpisodeSummary description={description} /> : null}
          </DetailListWrapper>
        </MainInnerContentWrapper>
      </MainInnerWrapper>
    </MainWrapper>
  );
};
