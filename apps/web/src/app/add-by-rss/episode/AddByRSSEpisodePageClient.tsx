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
import { EpisodeSummary } from '../../../components/Media/Podcast/Episode/EpisodeSummary';
import { CommonDetailListHeader } from '../../../components/Common/List/CommonDetailListHeader';
import { Tabs } from '../../../components/Tabs/Tabs';
import { AddByRSSPodcastHeader } from '../../../components/AddByRSS/Podcast/AddByRSSPodcastHeader';
import { AddByRSSEpisodeDetailHeader } from '../../../components/AddByRSS/Podcast/Episode/AddByRSSEpisodeDetailHeader';
import { getAddByRSSFeedByIdText, getAllAddByRSSFeeds } from '../../../utils/addByRSS/storage';
import type { AddByRSSFeedRecord, AddByRSSEpisodeIndexItem } from '../../../utils/addByRSS/types';
import { findAddByRSSEpisodeByGuid } from '../../../utils/addByRSS/episodeIndex';
import { getAddByRSSEpisodeByGuid } from '../../../utils/addByRSS/storage';

type AddByRSSEpisodePageClientProps = {
  itemGuid: string;
};

export const AddByRSSEpisodePageClient: React.FC<AddByRSSEpisodePageClientProps> = ({
  itemGuid,
}) => {
  const tFeatures = useTranslations('features');
  const tInfo = useTranslations('info');
  const tMisc = useTranslations('misc');
  const [feed, setFeed] = React.useState<AddByRSSFeedRecord | null>(null);
  const [episode, setEpisode] = React.useState<AddByRSSEpisodeIndexItem | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);

      let found = await getAddByRSSEpisodeByGuid(itemGuid);
      if (!found) {
        const feeds = await getAllAddByRSSFeeds();
        found = findAddByRSSEpisodeByGuid(feeds, itemGuid);
      }

      if (cancelled) {
        return;
      }

      if (!found) {
        setEpisode(null);
        setFeed(null);
        setIsLoading(false);
        return;
      }

      const feedRecord = await getAddByRSSFeedByIdText(found.feedIdText);
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
  }, [itemGuid]);

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
          <AddByRSSEpisodeDetailHeader itemGuid={episode.itemGuid} title={title} />
          <CommonDetailListHeader tabs={<Tabs tabData={tabData} selectedKey="summary" />} />
          <DetailListWrapper>
            {description ? <EpisodeSummary description={description} /> : null}
          </DetailListWrapper>
        </MainInnerContentWrapper>
      </MainInnerWrapper>
    </MainWrapper>
  );
};
