import type { DTOChannel, DTOItem, RemoteItemsResponse } from '@podverse/helpers';
import type { QueryParamsChannelMusicAlbum } from '@podverse/helpers-requests';
import { MainWrapper } from '../../../components/Main/MainWrapper';
import { AlbumPageContextProvider } from './AlbumPageContext';
import { AlbumPageListHeader } from './AlbumPageListHeader';
import { AlbumPageList } from './AlbumPageList';
import { MainInnerWrapper } from '../../../components/Main/MainInnerWrapper';
import { MainInnerContentWrapper } from '../../../components/Main/MainInnerContentWrapper';
import { AlbumPageSideContent } from './AlbumPageSideContent';
import { AlbumHeader } from '../../../components/Media/Music/Album/AlbumHeader';

interface AlbumPageClientProps {
  initialQueryParams: QueryParamsChannelMusicAlbum;
  ssrChannel: DTOChannel;
  ssrItemsWithLiveItem: DTOItem[];
  ssrItems: DTOItem[];
  ssrTotalPages: number;
  ssrPodroll: RemoteItemsResponse | null;
}

export function AlbumPageClient(props: AlbumPageClientProps) {
  const {
    initialQueryParams,
    ssrChannel,
    ssrItemsWithLiveItem,
    ssrItems,
    ssrTotalPages,
    ssrPodroll,
  } = props;

  return (
    <AlbumPageContextProvider
      initialQueryParams={initialQueryParams}
      ssrItemsWithLiveItem={ssrItemsWithLiveItem}
      ssrItems={ssrItems}
      ssrTotalPages={ssrTotalPages}
    >
      <MainWrapper>
        <AlbumHeader channel={ssrChannel} />
        <MainInnerWrapper>
          <AlbumPageSideContent channel={ssrChannel} podroll={ssrPodroll} />
          <MainInnerContentWrapper>
            <AlbumPageListHeader ssrHasPodroll={!!ssrPodroll} />
            <AlbumPageList ssrChannel={ssrChannel} podroll={ssrPodroll} />
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    </AlbumPageContextProvider>
  );
}
