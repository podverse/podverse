'use client';

import React from 'react';

import type { PublicBoostMessagesPageFetcher } from '@podverse/v4v-metaboost';

import { AddByRSSTrackNodes } from '../../../components/AddByRSS/Artist/Album/Track/AddByRSSTrackNodes';
import { AddByRSSNeedsCredentialsSection } from '../../../components/AddByRSS/List/AddByRSSNeedsCredentialsSection';
import { AddByRSSLivestreamNodes } from '../../../components/AddByRSS/Livestream/AddByRSSLivestreamNodes';
import { BoostMessagesSection } from '../../../components/Boost/messages/BoostMessagesSection';
import type { BoostBreadcrumbLinkResolver } from '../../../components/Boost/messages/types';
import { CommonAlbumListNodes } from '../../../components/Common/Artist/Album/CommonAlbumNodes';
import type { AlbumListItem } from '../../../components/Common/Artist/Album/types';
import { ContentAbout } from '../../../components/Content/About/ContentAbout';
import { DetailListWrapper } from '../../../components/List/DetailListWrapper';
import { AddByRSSCredentialsSettingsSection } from '../../../components/Settings/AddByRSSCredentialsSettingsSection';
import { SettingsWrapper } from '../../../components/Settings/SettingsWrapper';
import type { ViewSelectedOption } from '../../../components/ViewSelector/ViewSelector';
import type { AddByRSSNeedsCredentialsFeed } from '../../../utils/addByRSS/credentialsStatus';
import type {
  AddByRSSFeedRecord,
  AddByRSSItemIndexItem,
  AddByRSSLivestreamIndexItem,
} from '../../../utils/addByRSS/types';
import type { AddByRSSArtistPageTabKey } from './AddByRSSArtistPageListHeader';

type AddByRSSArtistPageListProps = {
  activeTab: AddByRSSArtistPageTabKey;
  albumItems: AlbumListItem[];
  needsCredentials: AddByRSSNeedsCredentialsFeed[];
  trackItems: AddByRSSItemIndexItem[];
  liveItems: AddByRSSLivestreamIndexItem[];
  description: string | null;
  descriptionIsTruncated: boolean;
  fullDescriptionUrl: string | null;
  viewSelected: ViewSelectedOption;
  boostsPageFetcher: PublicBoostMessagesPageFetcher | null;
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
  albumItems,
  needsCredentials,
  trackItems,
  liveItems,
  description,
  descriptionIsTruncated,
  fullDescriptionUrl,
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
        <>
          <AddByRSSNeedsCredentialsSection feeds={needsCredentials} />
          <CommonAlbumListNodes items={albumItems} viewSelected={viewSelected} />
        </>
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
      {activeTab === 'about' && (
        <ContentAbout
          description={description ?? undefined}
          isTruncated={descriptionIsTruncated}
          fullDescriptionUrl={fullDescriptionUrl}
        />
      )}
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
