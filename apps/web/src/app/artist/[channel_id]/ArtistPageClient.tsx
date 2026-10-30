import type {
  DTOChannel,
  DTOItem,
  DTORemoteChannelStub,
  RemoteItemsResponse,
} from '@podverse/helpers';
import type { QueryParamsChannelMusicArtist } from '@podverse/helpers-requests';
import { MainColumnStack, MainSidebarLayout } from '@podverse/ui';
import { getBoostEligibilityForContent } from '@podverse/v4v-metaboost';

import { ChannelSeenPageView } from '../../../components/ChannelSeen/ChannelSeenPageView';
import { DirectoryRemovedNotice } from '../../../components/Content/DirectoryRemovedNotice';
import { remoteItemsResponseHasRows } from '../../../components/Content/remoteItemStubRow';
import { CoreArtistHeader } from '../../../components/Core/Artist/CoreArtistHeader';
import { MainWrapper } from '../../../components/Main/MainWrapper';
import { DirectoryRemovedProvider } from '../../../contexts/DirectoryRemoved';
import { ArtistPageContextProvider } from './ArtistPageContext';
import { ArtistPageList } from './ArtistPageList';
import { ArtistPageListHeader } from './ArtistPageListHeader';
import { ArtistPageSideContent } from './ArtistPageSideContent';

interface ArtistPageClientProps {
  initialQueryParams: QueryParamsChannelMusicArtist;
  ssrChannel: DTOChannel;
  ssrChannelsAdded: DTOChannel[];
  ssrChannelsUnadded: DTORemoteChannelStub[];
  ssrItemsAdded: DTOItem[];
  ssrPodroll: RemoteItemsResponse | null;
  directoryRemoved: boolean;
}

export function ArtistPageClient(props: ArtistPageClientProps) {
  const {
    initialQueryParams,
    ssrChannel,
    ssrChannelsAdded,
    ssrChannelsUnadded,
    ssrItemsAdded,
    ssrPodroll,
    directoryRemoved,
  } = props;
  const ssrHasAlbums = ssrChannelsAdded.length > 0 || ssrChannelsUnadded.length > 0;
  const ssrHasTracks = ssrItemsAdded.length > 0;
  const ssrHasDescription = !!ssrChannel.channel_description;
  const ssrHasPodroll = remoteItemsResponseHasRows(ssrPodroll);
  const { canShowBoostMessagesTab: ssrCanShowBoosts } = getBoostEligibilityForContent({
    channel: ssrChannel,
    item: null,
  });

  return (
    <DirectoryRemovedProvider removed={directoryRemoved}>
      <ArtistPageContextProvider initialQueryParams={initialQueryParams}>
        <MainWrapper>
          <ChannelSeenPageView channelIdText={ssrChannel.id_text} />
          <CoreArtistHeader channel={ssrChannel} artistAlbums={ssrChannelsAdded} />
          <MainSidebarLayout>
            <ArtistPageSideContent channel={ssrChannel} podroll={ssrPodroll} />
            <MainColumnStack>
              {directoryRemoved ? (
                <DirectoryRemovedNotice />
              ) : (
                <>
                  <ArtistPageListHeader
                    channel={ssrChannel}
                    ssrHasAlbums={ssrHasAlbums}
                    ssrHasTracks={ssrHasTracks}
                    ssrHasDescription={ssrHasDescription}
                    ssrHasPeople={(ssrChannel.channel_persons?.length ?? 0) > 0}
                    ssrHasPodroll={ssrHasPodroll}
                    ssrCanShowBoosts={ssrCanShowBoosts}
                  />
                  <ArtistPageList
                    ssrChannel={ssrChannel}
                    ssrChannelsAdded={ssrChannelsAdded}
                    ssrChannelsUnadded={ssrChannelsUnadded}
                    ssrItemsAdded={ssrItemsAdded}
                    podroll={ssrPodroll}
                    ssrCanShowBoosts={ssrCanShowBoosts}
                  />
                </>
              )}
            </MainColumnStack>
          </MainSidebarLayout>
        </MainWrapper>
      </ArtistPageContextProvider>
    </DirectoryRemovedProvider>
  );
}
