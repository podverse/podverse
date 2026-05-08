'use client';

import type { DTOPlaylist } from '@podverse/helpers';
import { MainColumnStack, MainSidebarLayout, SideContent } from '@podverse/ui';

import { MainWrapper } from '../../../components/Main/MainWrapper';
import { StatsPlaylistPageView } from '../../../components/StatsTracking/StatsPageViewTrackers';
import { PlaylistPageContextProvider } from './PlaylistPageContext';
import { PlaylistPageHeader } from './PlaylistPageHeader';
import { PlaylistPageList } from './PlaylistPageList';

interface PlaylistPageClientProps {
  ssrPlaylist: DTOPlaylist;
}

export function PlaylistPageClient({ ssrPlaylist }: PlaylistPageClientProps) {
  return (
    <PlaylistPageContextProvider ssrPlaylist={ssrPlaylist}>
      <StatsPlaylistPageView playlistIdText={ssrPlaylist.id_text} />
      <PlaylistPageHeader playlist={ssrPlaylist} />
      <MainWrapper>
        <MainSidebarLayout>
          <SideContent />
          <MainColumnStack>
            <PlaylistPageList ssrPlaylist={ssrPlaylist} />
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </PlaylistPageContextProvider>
  );
}
