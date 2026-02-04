import type {
  DTOChannel,
  DTOItem,
  EpisodeByGuidResponse,
  PodcastBatchByFeedGuidResponse,
  RemoteItemsResponse,
} from '@podverse/helpers';
import type { QueryParamsChannelMusicArtist } from '@podverse/helpers-requests';
import { MainWrapper } from '../../../components/Main/MainWrapper';
import { ArtistPageContextProvider } from './ArtistPageContext';
import { ArtistPageListHeader } from './ArtistPageListHeader';
import { ArtistPageList } from './ArtistPageList';
import { MainInnerWrapper } from '../../../components/Main/MainInnerWrapper';
import { MainInnerContentWrapper } from '../../../components/Main/MainInnerContentWrapper';
import { ArtistPageSideContent } from './ArtistPageSideContent';
import { ArtistHeader } from '../../../components/Media/Music/Artist/ArtistHeader';

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

  return (
    <ArtistPageContextProvider initialQueryParams={initialQueryParams}>
      <MainWrapper>
        <ArtistHeader channel={ssrChannel} />
        <MainInnerWrapper>
          <ArtistPageSideContent channel={ssrChannel} podroll={ssrPodroll} />
          <MainInnerContentWrapper>
            <ArtistPageListHeader
              ssrHasAlbums={ssrHasAlbums}
              ssrHasTracks={ssrHasTracks}
              ssrHasDescription={ssrHasDescription}
              ssrHasPodroll={ssrHasPodroll}
            />
            <ArtistPageList
              ssrChannel={ssrChannel}
              ssrChannelsAdded={ssrChannelsAdded}
              ssrChannelsUnadded={ssrChannelsUnadded}
              ssrItemsAdded={ssrItemsAdded}
              ssrItemsUnadded={ssrItemsUnadded}
              podroll={ssrPodroll}
            />
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    </ArtistPageContextProvider>
  );
}
