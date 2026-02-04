'use client';

import React from 'react';

import { DetailListWrapper } from '../../../components/List/DetailListWrapper';
import { ContentAbout } from '../../../components/Content/About/ContentAbout';
import type { ViewSelectedOption } from '../../../components/ViewSelector/ViewSelector';
import { AddByRSSAlbumNodes } from '../../../components/AddByRSS/Artist/Album/AddByRSSAlbumNodes';
import { AddByRSSTrackNodes } from '../../../components/AddByRSS/Artist/Album/Track/AddByRSSTrackNodes';
import type { AddByRSSFeedRecord } from '../../../utils/addByRSS/types';
import type { AddByRSSArtistPageTabKey } from './AddByRSSArtistPageListHeader';

type AddByRSSArtistPageListProps = {
  activeTab: AddByRSSArtistPageTabKey;
  albumFeeds: AddByRSSFeedRecord[];
  trackFeeds: AddByRSSFeedRecord[];
  description: string | null;
  viewSelected: ViewSelectedOption;
};

export const AddByRSSArtistPageList: React.FC<AddByRSSArtistPageListProps> = ({
  activeTab,
  albumFeeds,
  trackFeeds,
  description,
  viewSelected,
}) => {
  return (
    <DetailListWrapper>
      {activeTab === 'albums' && (
        <AddByRSSAlbumNodes feeds={albumFeeds} viewSelected={viewSelected} />
      )}
      {activeTab === 'tracks' && (
        <AddByRSSTrackNodes feeds={trackFeeds} viewSelected={viewSelected} />
      )}
      {activeTab === 'about' && <ContentAbout description={description ?? undefined} />}
    </DetailListWrapper>
  );
};
