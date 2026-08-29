import type { DTOChannel, DTOItem, RemoteItemsResponse } from '@podverse/helpers';
import type { QueryParamsChannelMusicAlbum } from '@podverse/helpers-requests';
import { MainColumnStack, MainSidebarLayout } from '@podverse/ui';

import { ChannelSeenPageView } from '../../../components/ChannelSeen/ChannelSeenPageView';
import { CoreAlbumHeader } from '../../../components/Core/Artist/Album/CoreAlbumHeader';
import { MainWrapper } from '../../../components/Main/MainWrapper';
import { getBoostEligibilityForContent } from '../../../utils/value/boostEligibility';
import { AlbumPageContextProvider } from './AlbumPageContext';
import { AlbumPageList } from './AlbumPageList';
import { AlbumPageListHeader } from './AlbumPageListHeader';
import { AlbumPageSideContent } from './AlbumPageSideContent';

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
  const { canShowBoostMessagesTab: ssrCanShowBoosts } = getBoostEligibilityForContent({
    channel: ssrChannel,
    item: null,
  });

  return (
    <AlbumPageContextProvider
      initialQueryParams={initialQueryParams}
      ssrItemsWithLiveItem={ssrItemsWithLiveItem}
      ssrItems={ssrItems}
      ssrTotalPages={ssrTotalPages}
    >
      <MainWrapper>
        <ChannelSeenPageView channelIdText={ssrChannel.id_text} />
        <CoreAlbumHeader channel={ssrChannel} />
        <MainSidebarLayout>
          <AlbumPageSideContent channel={ssrChannel} podroll={ssrPodroll} />
          <MainColumnStack>
            <AlbumPageListHeader ssrHasPodroll={!!ssrPodroll} ssrCanShowBoosts={ssrCanShowBoosts} />
            <AlbumPageList
              ssrChannel={ssrChannel}
              podroll={ssrPodroll}
              ssrCanShowBoosts={ssrCanShowBoosts}
            />
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </AlbumPageContextProvider>
  );
}
