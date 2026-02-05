'use client';

import type { DTOPlaylist } from '@podverse/helpers';
import { MainWrapper } from '../../../components/Main/MainWrapper';
import { MainInnerWrapper } from '../../../components/Main/MainInnerWrapper';
import { MainInnerContentWrapper } from '../../../components/Main/MainInnerContentWrapper';
import { PlaylistPageHeader } from './PlaylistPageHeader';
import { PlaylistPageContextProvider } from './PlaylistPageContext';
import { PlaylistPageList } from './PlaylistPageList';
import { SideContent } from '../../../components/SideContent/SideContent';

interface PlaylistPageClientProps {
  ssrPlaylist: DTOPlaylist;
}

export function PlaylistPageClient({ ssrPlaylist }: PlaylistPageClientProps) {
  return (
    <PlaylistPageContextProvider ssrPlaylist={ssrPlaylist}>
      <PlaylistPageHeader playlist={ssrPlaylist} />
      <MainWrapper>
        <MainInnerWrapper>
          <SideContent />
          <MainInnerContentWrapper>
            <PlaylistPageList ssrPlaylist={ssrPlaylist} />
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    </PlaylistPageContextProvider>
  );
}
