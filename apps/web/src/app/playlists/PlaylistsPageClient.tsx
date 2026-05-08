'use client';

import type { DTOPlaylist } from '@podverse/helpers';
import type { QueryParamsPlaylists } from '@podverse/helpers-requests';
import { MainColumnStack, MainSidebarLayout } from '@podverse/ui';

import { MainWrapper } from '../../components/Main/MainWrapper';
import { PlaylistsPageContextProvider } from './PlaylistsPageContext';
import { PlaylistsPageHeader } from './PlaylistsPageHeader';
import { PlaylistsPageList } from './PlaylistsPageList';
import { PlaylistsPageListHeader } from './PlaylistsPageListHeader';

interface PlaylistsPageClientProps {
  initialQueryParams: QueryParamsPlaylists;
  ssrPlaylists: DTOPlaylist[];
  ssrTotalPages: number;
}

export function PlaylistsPageClient(props: PlaylistsPageClientProps) {
  const { initialQueryParams, ssrPlaylists, ssrTotalPages } = props;

  return (
    <PlaylistsPageContextProvider
      initialQueryParams={initialQueryParams}
      ssrPlaylists={ssrPlaylists}
      ssrTotalPages={ssrTotalPages}
    >
      <PlaylistsPageHeader />
      <MainWrapper>
        <MainSidebarLayout>
          <MainColumnStack>
            <PlaylistsPageListHeader />
            <PlaylistsPageList />
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </PlaylistsPageContextProvider>
  );
}
