'use client';

import React from 'react';

import { AddByRSSAlbumNodes } from '../../../components/AddByRSS/Artist/Album/AddByRSSAlbumNodes';
import { AddByRSSTrackNodes } from '../../../components/AddByRSS/Artist/Album/Track/AddByRSSTrackNodes';
import { AddByRSSLivestreamNodes } from '../../../components/AddByRSS/Livestream/AddByRSSLivestreamNodes';
import { BoostMessagesSection } from '../../../components/Boost/messages/BoostMessagesSection';
import type {
  BoostBreadcrumbLinkResolver,
  BoostMessagesPageFetcher,
} from '../../../components/Boost/messages/types';
import { ContentAbout } from '../../../components/Content/About/ContentAbout';
import { DetailListWrapper } from '../../../components/List/DetailListWrapper';
import { AddByRSSCredentialsSettingsSection } from '../../../components/Settings/AddByRSSCredentialsSettingsSection';
import { SettingsWrapper } from '../../../components/Settings/SettingsWrapper';
import type { ViewSelectedOption } from '../../../components/ViewSelector/ViewSelector';
import type {
  AddByRSSFeedRecord,
  AddByRSSItemIndexItem,
  AddByRSSLivestreamIndexItem,
} from '../../../utils/addByRSS/types';
import type { AddByRSSArtistPageTabKey } from './AddByRSSArtistPageListHeader';

type AddByRSSArtistPageListProps = {
  activeTab: AddByRSSArtistPageTabKey;
  albumFeeds: AddByRSSFeedRecord[];
  trackItems: AddByRSSItemIndexItem[];
  liveItems: AddByRSSLivestreamIndexItem[];
  description: string | null;
  viewSelected: ViewSelectedOption;
  boostsPageFetcher: BoostMessagesPageFetcher | null;
  breadcrumbLinkResolver?: BoostBreadcrumbLinkResolver;
  refreshTrigger: number;
  boostsHeading: string;
  accountIdText: string | null;
  settingsFeed: AddByRSSFeedRecord | null;
  onSettingsFeedUpdated?: (feed: AddByRSSFeedRecord) => void;
  loginPrompt?: React.ReactNode;
};

export const AddByRSSArtistPageList: React.FC<AddByRSSArtistPageListProps> = ({
  activeTab,
  albumFeeds,
  trackItems,
  liveItems,
  description,
  viewSelected,
  boostsPageFetcher,
  breadcrumbLinkResolver,
  refreshTrigger,
  boostsHeading,
  accountIdText,
  settingsFeed,
  onSettingsFeedUpdated,
  loginPrompt,
}) => {
  return (
    <DetailListWrapper>
      {activeTab === 'albums' && (
        <AddByRSSAlbumNodes feeds={albumFeeds} viewSelected={viewSelected} />
      )}
      {activeTab === 'tracks' && (
        <>
          {liveItems.length > 0 && (
            <AddByRSSLivestreamNodes
              items={liveItems}
              viewSelected={viewSelected}
              showChannelInfo
            />
          )}
          <AddByRSSTrackNodes items={trackItems} viewSelected={viewSelected} />
        </>
      )}
      {activeTab === 'about' && <ContentAbout description={description ?? undefined} />}
      {activeTab === 'boosts' && boostsPageFetcher !== null && (
        <BoostMessagesSection
          heading={boostsHeading}
          pageFetcher={boostsPageFetcher}
          breadcrumbLinkResolver={breadcrumbLinkResolver}
          refreshTrigger={refreshTrigger}
        />
      )}
      {activeTab === 'settings' && (
        <SettingsWrapper removeWrapperMargin>
          {loginPrompt}
          {accountIdText !== null && settingsFeed !== null ? (
            <AddByRSSCredentialsSettingsSection
              accountIdText={accountIdText}
              feed={settingsFeed}
              onFeedUpdated={onSettingsFeedUpdated}
            />
          ) : null}
        </SettingsWrapper>
      )}
    </DetailListWrapper>
  );
};
