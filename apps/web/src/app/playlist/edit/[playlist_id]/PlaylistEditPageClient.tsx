'use client';

import type { DTOPlaylist } from '@podverse/helpers';
import { PlaylistEditPageContextProvider } from './PlaylistEditPageContext';
import { PlaylistEditPageForm } from './PlaylistEditPageForm';
import { PlaylistEditPageHeader } from './PlaylistEditPageHeader';
import { MainWrapper } from '../../../../components/Main/MainWrapper';
import { MainInnerWrapper } from '../../../../components/Main/MainInnerWrapper';
import { MainInnerContentWrapper } from '../../../../components/Main/MainInnerContentWrapper';
import { PlaylistEditPageButtonTabs } from './PlaylistEditPageButtonTabs';
import { PlaylistEditPageList } from './PlaylistEditPageList';
import { SideContent } from '../../../../components/SideContent/SideContent';

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
