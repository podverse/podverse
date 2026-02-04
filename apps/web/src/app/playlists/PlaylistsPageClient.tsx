'use client';

import type { DTOPlaylist } from '@podverse/helpers';
import type { QueryParamsPlaylists } from '@podverse/helpers-requests';
import { PlaylistsPageContextProvider } from './PlaylistsPageContext';
import { MainWrapper } from '../../components/Main/MainWrapper';
import { PlaylistsPageHeader } from './PlaylistsPageHeader';
import { PlaylistsPageList } from './PlaylistsPageList';
import { MainInnerWrapper } from '../../components/Main/MainInnerWrapper';
import { MainInnerContentWrapper } from '../../components/Main/MainInnerContentWrapper';
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
        <MainInnerWrapper>
          <MainInnerContentWrapper>
            <PlaylistsPageListHeader />
            <PlaylistsPageList />
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    </PlaylistsPageContextProvider>
  );
}
