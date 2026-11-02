'use client';

import type { DTOPlaylist } from '@podverse/helpers';
import { MainColumnStack, MainSidebarLayout } from '@podverse/ui';

import { MainWrapper } from '../../../../components/Main/MainWrapper';
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
        <MainSidebarLayout>
          <MainColumnStack>
            <PlaylistEditPageButtonTabs />
            <PlaylistEditPageForm ssrPlaylist={ssrPlaylist} />
            <PlaylistEditPageList ssrPlaylist={ssrPlaylist} />
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </PlaylistEditPageContextProvider>
  );
}
