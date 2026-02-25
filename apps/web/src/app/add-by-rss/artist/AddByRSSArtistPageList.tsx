'use client';

import React from 'react';

import { DetailListWrapper } from '../../../components/List/DetailListWrapper';
import { ContentAbout } from '../../../components/Content/About/ContentAbout';
import type { ViewSelectedOption } from '../../../components/ViewSelector/ViewSelector';
import { AddByRSSAlbumNodes } from '../../../components/AddByRSS/Artist/Album/AddByRSSAlbumNodes';
import { AddByRSSTrackNodes } from '../../../components/AddByRSS/Artist/Album/Track/AddByRSSTrackNodes';
import { AddByRSSLivestreamNodes } from '../../../components/AddByRSS/Livestream/AddByRSSLivestreamNodes';
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
};

export const AddByRSSArtistPageList: React.FC<AddByRSSArtistPageListProps> = ({
  activeTab,
  albumFeeds,
  trackItems,
  liveItems,
  description,
  viewSelected,
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
    </DetailListWrapper>
  );
};
