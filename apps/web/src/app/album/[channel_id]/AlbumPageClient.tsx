import type { DTOChannel, DTOItem, RemoteItemsResponse } from '@podverse/helpers';
import type { QueryParamsChannelMusicAlbum } from '@podverse/helpers-requests';
import { MainColumnStack, MainSidebarLayout } from '@podverse/ui';
import { getBoostEligibilityForContent } from '@podverse/v4v-metaboost';

import { ChannelSeenPageView } from '../../../components/ChannelSeen/ChannelSeenPageView';
import { DirectoryRemovedNotice } from '../../../components/Content/DirectoryRemovedNotice';
import { remoteItemsResponseHasRows } from '../../../components/Content/remoteItemStubRow';
import { CoreAlbumHeader } from '../../../components/Core/Artist/Album/CoreAlbumHeader';
import { MainWrapper } from '../../../components/Main/MainWrapper';
import { DirectoryRemovedProvider } from '../../../contexts/DirectoryRemoved';
import { AlbumPageContextProvider } from './AlbumPageContext';
import { AlbumPageList } from './AlbumPageList';
import { AlbumPageListHeader } from './AlbumPageListHeader';
import { AlbumPageSideContent } from './AlbumPageSideContent';

interface AlbumPageClientProps {
  hasExplicitUrlParams: boolean;
  initialQueryParams: QueryParamsChannelMusicAlbum;
  ssrChannel: DTOChannel;
  ssrItemsWithLiveItem: DTOItem[];
  ssrItems: DTOItem[];
  ssrTotalPages: number;
  ssrPodroll: RemoteItemsResponse | null;
  ssrRemoteItems: RemoteItemsResponse | null;
  directoryRemoved: boolean;
}

export function AlbumPageClient(props: AlbumPageClientProps) {
  const {
    hasExplicitUrlParams,
    initialQueryParams,
    ssrChannel,
    ssrItemsWithLiveItem,
    ssrItems,
    ssrTotalPages,
    ssrPodroll,
    ssrRemoteItems,
    directoryRemoved,
  } = props;
  const { canShowBoostMessagesTab: ssrCanShowBoosts } = getBoostEligibilityForContent({
    channel: ssrChannel,
    item: null,
  });

  return (
    <DirectoryRemovedProvider removed={directoryRemoved}>
      <AlbumPageContextProvider
        hasExplicitUrlParams={hasExplicitUrlParams}
        initialQueryParams={initialQueryParams}
        ssrChannelIdText={ssrChannel.id_text}
        ssrItemsWithLiveItem={ssrItemsWithLiveItem}
        ssrItems={ssrItems}
        ssrTotalPages={ssrTotalPages}
        directoryRemoved={directoryRemoved}
      >
        <MainWrapper>
          <ChannelSeenPageView channelIdText={ssrChannel.id_text} />
          <CoreAlbumHeader channel={ssrChannel} />
          <MainSidebarLayout>
            <AlbumPageSideContent
              channel={ssrChannel}
              podroll={ssrPodroll}
              remoteItems={ssrRemoteItems}
            />
            <MainColumnStack>
              {directoryRemoved ? (
                <DirectoryRemovedNotice />
              ) : (
                <>
                  <AlbumPageListHeader
                    ssrHasPeople={(ssrChannel.channel_persons?.length ?? 0) > 0}
                    ssrHasPodroll={remoteItemsResponseHasRows(ssrPodroll)}
                    ssrHasRemoteItems={remoteItemsResponseHasRows(ssrRemoteItems)}
                    ssrCanShowBoosts={ssrCanShowBoosts}
                  />
                  <AlbumPageList
                    ssrChannel={ssrChannel}
                    podroll={ssrPodroll}
                    remoteItems={ssrRemoteItems}
                    ssrCanShowBoosts={ssrCanShowBoosts}
                  />
                </>
              )}
            </MainColumnStack>
          </MainSidebarLayout>
        </MainWrapper>
      </AlbumPageContextProvider>
    </DirectoryRemovedProvider>
  );
}
