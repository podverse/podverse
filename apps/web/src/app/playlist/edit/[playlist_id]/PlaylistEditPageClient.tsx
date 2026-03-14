'use client';

import type { DTOPlaylist } from '@podverse/helpers';

import { MainInnerContentWrapper } from '../../../../components/Main/MainInnerContentWrapper';
import { MainInnerWrapper } from '../../../../components/Main/MainInnerWrapper';
import { MainWrapper } from '../../../../components/Main/MainWrapper';
import { SideContent } from '../../../../components/SideContent/SideContent';
import { PlaylistEditPageButtonTabs } from './PlaylistEditPageButtonTabs';
import { PlaylistEditPageContextProvider } from './PlaylistEditPageContext';
import { PlaylistEditPageForm } from './PlaylistEditPageForm';
import { PlaylistEditPageHeader } from './PlaylistEditPageHeader';
import { PlaylistEditPageList } from './PlaylistEditPageList';

type PlaylistEditPageClientProps = {
  ssrPlaylist: DTOPlaylist;
};

export function PlaylistEditPageClient({ ssrPlaylist }: PlaylistEditPageClientProps) {
  return (
    <PlaylistEditPageContextProvider ssrPlaylist={ssrPlaylist}>
      <PlaylistEditPageHeader />
      <MainWrapper>
        <MainInnerWrapper>
          <SideContent />
          <MainInnerContentWrapper>
            <PlaylistEditPageButtonTabs />
            <PlaylistEditPageForm ssrPlaylist={ssrPlaylist} />
            <PlaylistEditPageList ssrPlaylist={ssrPlaylist} />
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    </PlaylistEditPageContextProvider>
  );
}
