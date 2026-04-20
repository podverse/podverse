import type {
  DTOChannel,
  DTOItem,
  EpisodeByGuidResponse,
  PodcastBatchByFeedGuidResponse,
  RemoteItemsResponse,
} from '@podverse/helpers';
import type { QueryParamsChannelMusicArtist } from '@podverse/helpers-requests';

import { CoreArtistHeader } from '../../../components/Core/Artist/CoreArtistHeader';
import { MainInnerContentWrapper } from '../../../components/Main/MainInnerContentWrapper';
import { MainInnerWrapper } from '../../../components/Main/MainInnerWrapper';
import { MainWrapper } from '../../../components/Main/MainWrapper';
import { getBoostEligibilityForContent } from '../../../utils/value/boostEligibility';
import { ArtistPageContextProvider } from './ArtistPageContext';
import { ArtistPageList } from './ArtistPageList';
import { ArtistPageListHeader } from './ArtistPageListHeader';
import { ArtistPageSideContent } from './ArtistPageSideContent';

interface ArtistPageClientProps {
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
    <ArtistPageContextProvider initialQueryParams={initialQueryParams}>
      <MainWrapper>
        <CoreArtistHeader channel={ssrChannel} />
        <MainInnerWrapper>
          <ArtistPageSideContent channel={ssrChannel} podroll={ssrPodroll} />
          <MainInnerContentWrapper>
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
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    </ArtistPageContextProvider>
  );
}
