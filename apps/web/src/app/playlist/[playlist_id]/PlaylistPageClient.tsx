'use client';

import type { DTOPlaylist } from '@podverse/helpers';

import { MainInnerContentWrapper } from '../../../components/Main/MainInnerContentWrapper';
import { MainInnerWrapper } from '../../../components/Main/MainInnerWrapper';
import { MainWrapper } from '../../../components/Main/MainWrapper';
import { SideContent } from '../../../components/SideContent/SideContent';
import { PlaylistPageContextProvider } from './PlaylistPageContext';
import { PlaylistPageHeader } from './PlaylistPageHeader';
import { PlaylistPageList } from './PlaylistPageList';

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
