import type {
  DTOChannel,
  DTOItem,
  EpisodeByGuidResponse,
  PodcastBatchByFeedGuidResponse,
  RemoteItemsResponse,
} from '@podverse/helpers';
import type { QueryParamsChannelMusicArtist } from '@podverse/helpers-requests';
import { MainColumnStack, MainSidebarLayout } from '@podverse/ui';

import { ChannelSeenPageView } from '../../../components/ChannelSeen/ChannelSeenPageView';
import { CoreArtistHeader } from '../../../components/Core/Artist/CoreArtistHeader';
import { MainWrapper } from '../../../components/Main/MainWrapper';
import { getBoostEligibilityForContent } from '../../../utils/value/boostEligibility';
import { ArtistPageContextProvider } from './ArtistPageContext';
import { ArtistPageList } from './ArtistPageList';
import { ArtistPageListHeader } from './ArtistPageListHeader';
import { ArtistPageSideContent } from './ArtistPageSideContent';

interface ArtistPageClientProps {
  hasExplicitUrlParams: boolean;
  initialQueryParams: QueryParamsChannelMusicArtist;
  ssrChannel: DTOChannel;
  ssrChannelsAdded: DTOChannel[];
  ssrChannelsUnadded: PodcastBatchByFeedGuidResponse['feeds'];
  ssrItemsAdded: DTOItem[];
  ssrItemsUnadded: NonNullable<EpisodeByGuidResponse['episode']>[];
  ssrPodroll: RemoteItemsResponse | null;
}

export function ArtistPageClient(props: ArtistPageClientProps) {
  const {
    hasExplicitUrlParams,
    initialQueryParams,
    ssrChannel,
    ssrChannelsAdded,
    ssrChannelsUnadded,
    ssrItemsAdded,
    ssrItemsUnadded,
    ssrPodroll,
  } = props;
  const ssrHasAlbums = ssrChannelsAdded.length > 0 || ssrChannelsUnadded.length > 0;
  const ssrHasTracks = ssrItemsAdded.length > 0 || ssrItemsUnadded.length > 0;
  const ssrHasDescription = !!ssrChannel.channel_description;
  const ssrHasPodroll = !!ssrPodroll;
  const { canShowBoostMessagesTab: ssrCanShowBoosts } = getBoostEligibilityForContent({
    channel: ssrChannel,
    item: null,
  });

  return (
    <ArtistPageContextProvider
      hasExplicitUrlParams={hasExplicitUrlParams}
      initialQueryParams={initialQueryParams}
      ssrChannelIdText={ssrChannel.id_text}
    >
      <MainWrapper>
        <ChannelSeenPageView channelIdText={ssrChannel.id_text} />
        <CoreArtistHeader channel={ssrChannel} />
        <MainSidebarLayout>
          <ArtistPageSideContent channel={ssrChannel} podroll={ssrPodroll} />
          <MainColumnStack>
            <ArtistPageListHeader
              ssrHasAlbums={ssrHasAlbums}
              ssrHasTracks={ssrHasTracks}
              ssrHasDescription={ssrHasDescription}
              ssrHasPodroll={ssrHasPodroll}
              ssrCanShowBoosts={ssrCanShowBoosts}
            />
            <ArtistPageList
              ssrChannel={ssrChannel}
              ssrChannelsAdded={ssrChannelsAdded}
              ssrChannelsUnadded={ssrChannelsUnadded}
              ssrItemsAdded={ssrItemsAdded}
              ssrItemsUnadded={ssrItemsUnadded}
              podroll={ssrPodroll}
              ssrCanShowBoosts={ssrCanShowBoosts}
            />
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </ArtistPageContextProvider>
  );
}
