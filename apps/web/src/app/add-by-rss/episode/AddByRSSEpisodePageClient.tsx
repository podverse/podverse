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
import { AddByRSSEpisodeDetailHeader } from '../../../components/AddByRSS/Podcast/Episode/AddByRSSEpisodeDetailHeader';
import { useAccount } from '../../../contexts/Account';
import { syncAddByRSSCacheWithServer } from '../../../utils/addByRSS/sync';
import { getAddByRSSFeedByIdText, getAddByRSSItemByIdText } from '../../../utils/addByRSS/storage';
import type { AddByRSSFeedRecord, AddByRSSItemIndexItem } from '../../../utils/addByRSS/types';

type AddByRSSEpisodePageClientProps = {
  itemIdText: string;
};

export const AddByRSSEpisodePageClient: React.FC<AddByRSSEpisodePageClientProps> = ({
  itemIdText,
}) => {
  const tFeatures = useTranslations('features');
  const tInfo = useTranslations('info');
  const tMisc = useTranslations('misc');
  const { loggedInAccount } = useAccount();
  const [feed, setFeed] = React.useState<AddByRSSFeedRecord | null>(null);
  const [episode, setEpisode] = React.useState<AddByRSSItemIndexItem | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);

      if (!itemIdText) {
        setEpisode(null);
        setFeed(null);
        setIsLoading(false);
        return;
      }

      if (!loggedInAccount) {
        setEpisode(null);
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
        setEpisode(null);
        setFeed(null);
        setIsLoading(false);
        return;
      }

      const feedRecord = await getAddByRSSFeedByIdText(found.channelIdText);
      if (cancelled) {
        return;
      }

      setEpisode(found);
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

  if (!episode || !feed) {
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

  const title = episode.bundle.item.title ?? tInfo('episode.episode');
  const description = episode.bundle.description?.value ?? null;

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
      <AddByRSSPodcastHeader feed={feed} />
      <MainInnerWrapper>
        <SideContent />
        <MainInnerContentWrapper>
          <AddByRSSEpisodeDetailHeader
            itemIdText={episode.idText}
            title={title}
            indexItem={episode}
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
