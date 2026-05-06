'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React from 'react';

import { buildAddByRssBoostChannel } from '@podverse/parser-mapping';
import { Tabs } from '@podverse/ui';

import { AddByRSSArtistHeader } from '../../../components/AddByRSS/Artist/AddByRSSArtistHeader';
import { AddByRSSAlbumHeader } from '../../../components/AddByRSS/Artist/Album/AddByRSSAlbumHeader';
import { AddByRSSLivestreamDetailHeader } from '../../../components/AddByRSS/Livestream/AddByRSSLivestreamDetailHeader';
import { AddByRSSPodcastHeader } from '../../../components/AddByRSS/Podcast/AddByRSSPodcastHeader';
import { BoostMessagesSection } from '../../../components/Boost/messages/BoostMessagesSection';
import { useBoostMessagesView } from '../../../components/Boost/messages/useBoostMessagesView';
import { CommonDetailListHeader } from '../../../components/Common/List/CommonDetailListHeader';
import { CoreEpisodeSummary } from '../../../components/Core/Podcast/Episodes/CoreEpisodeSummary';
import { DetailListWrapper } from '../../../components/List/DetailListWrapper';
import LoadingSpinnerOverlay from '../../../components/LoadingSpinner/LoadingSpinnerOverlay';
import { MainInnerContentWrapper } from '../../../components/Main/MainInnerContentWrapper';
import { MainInnerWrapper } from '../../../components/Main/MainInnerWrapper';
import { MainWrapper } from '../../../components/Main/MainWrapper';
import { NoResults } from '../../../components/NoResults/NoResults';
import { SideContent } from '../../../components/SideContent/SideContent';
import { useAccount } from '../../../contexts/Account';
import {
  getAddByRSSFeedByIdText,
  getAddByRSSItemByGuid,
  getAddByRSSLivestreamByGuid,
  getAddByRSSLivestreamByIdText,
} from '../../../utils/addByRSS/storage';
import { syncAddByRSSCacheWithServer } from '../../../utils/addByRSS/sync';
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
  const tValue = useTranslations('value');
  const tV4VBoostMessages = useTranslations('v4v.boost_messages');
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loggedInAccount } = useAccount();
  const [feed, setFeed] = React.useState<AddByRSSFeedRecord | null>(null);
  const [livestream, setLivestream] = React.useState<AddByRSSLivestreamIndexItem | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const initialType = React.useMemo<'summary' | 'boosts'>(() => {
    const typeParam = searchParams.get('type');
    if (typeParam === 'boosts') {
      return typeParam;
    }
    return 'summary';
  }, [searchParams]);
  const [selectedTab, setSelectedTab] = React.useState<'summary' | 'boosts'>(initialType);
  const boostChannel = React.useMemo(() => (feed ? buildAddByRssBoostChannel(feed) : null), [feed]);
  const resolveChannelHref = React.useCallback(
    (channelIdText: string) => {
      if (feed?.resourceType === 'artists') {
        return `/add-by-rss/artist/${channelIdText}`;
      }
      if (feed?.resourceType === 'albums') {
        return `/add-by-rss/album/${channelIdText}`;
      }
      return `/add-by-rss/podcast/${channelIdText}`;
    },
    [feed?.resourceType]
  );
  const { canShowBoostTab, boostsPageFetcher, breadcrumbLinkResolver, refreshTrigger } =
    useBoostMessagesView({
      channel: boostChannel,
      itemGuid: livestream?.itemGuid ?? null,
      scopeType: 'livestream',
      channelIdText: feed?.idText ?? null,
      resolveChannelHref,
      resolveItemIdTextByGuid: async (itemGuid) => {
        const livestreamItem = await getAddByRSSLivestreamByGuid(itemGuid);
        if (livestreamItem?.idText) {
          return livestreamItem.idText;
        }

        const item = await getAddByRSSItemByGuid(itemGuid);
        return item?.idText ?? null;
      },
      resolveItemHref: (itemIdText) => `/add-by-rss/${mediumSlug}/livestream/${itemIdText}`,
    });

  const handleTabSelect = React.useCallback(
    (tab: 'summary' | 'boosts') => {
      setSelectedTab(tab);
      const nextParams = new URLSearchParams(searchParams.toString());
      if (tab === 'summary') {
        nextParams.delete('type');
      } else {
        nextParams.set('type', tab);
      }
      const nextQuery = nextParams.toString();
      router.replace(nextQuery === '' ? pathname : `${pathname}?${nextQuery}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  React.useEffect(() => {
    if (!canShowBoostTab && selectedTab === 'boosts') {
      handleTabSelect('summary');
    }
  }, [canShowBoostTab, handleTabSelect, selectedTab]);

  React.useEffect(() => {
    if (searchParams.has('type')) {
      setSelectedTab(initialType);
    }
  }, [initialType, searchParams]);

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
      onClick: () => handleTabSelect('summary'),
      zIndex: 1,
    },
  ];
  if (canShowBoostTab) {
    tabData.push({
      key: 'boosts',
      label: tValue('boost'),
      onClick: () => handleTabSelect('boosts'),
      zIndex: 2,
    });
  }

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
            indexItem={livestream}
          />
          <CommonDetailListHeader tabs={<Tabs tabData={tabData} selectedKey={selectedTab} />} />
          <DetailListWrapper>
            {selectedTab === 'summary' &&
              (description ? <CoreEpisodeSummary description={description} /> : null)}
            {selectedTab === 'boosts' && boostsPageFetcher !== null && (
              <BoostMessagesSection
                heading={tV4VBoostMessages('title')}
                pageFetcher={boostsPageFetcher}
                breadcrumbLinkResolver={breadcrumbLinkResolver}
                refreshTrigger={refreshTrigger}
              />
            )}
          </DetailListWrapper>
        </MainInnerContentWrapper>
      </MainInnerWrapper>
    </MainWrapper>
  );
};
