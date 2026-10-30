import type {
  DTOChannel,
  DTOClip,
  DTOItem,
  DTOItemSoundbite,
  RemoteItemsResponse,
} from '@podverse/helpers';
import type { QueryParamsChannel } from '@podverse/helpers-requests';
import { MainColumnStack, MainSidebarLayout } from '@podverse/ui';
import { getBoostEligibilityForContent } from '@podverse/v4v-metaboost';

import { ChannelSeenPageView } from '../../../components/ChannelSeen/ChannelSeenPageView';
import { DirectoryRemovedNotice } from '../../../components/Content/DirectoryRemovedNotice';
import { remoteItemsResponseHasRows } from '../../../components/Content/remoteItemStubRow';
import { CorePodcastHeader } from '../../../components/Core/Podcast/CorePodcastHeader';
import { MainWrapper } from '../../../components/Main/MainWrapper';
import { DirectoryRemovedProvider } from '../../../contexts/DirectoryRemoved';
import { PodcastPageContextProvider } from './PodcastPageContext';
import { PodcastPageList } from './PodcastPageList';
import { PodcastPageListHeader } from './PodcastPageListHeader';
import { PodcastPageSideContent } from './PodcastPageSideContent';

interface PodcastPageClientProps {
  hasExplicitUrlParams: boolean;
  initialQueryParams: QueryParamsChannel;
  ssrChannel: DTOChannel;
  ssrItemsWithLiveItem: DTOItem[];
  ssrItems: DTOItem[];
  ssrItemSoundbites: DTOItemSoundbite[];
  ssrHasItemSoundbites: boolean;
  ssrClips: DTOClip[];
  ssrTotalPages: number;
  ssrPodroll: RemoteItemsResponse | null;
  ssrRemoteItems: RemoteItemsResponse | null;
  directoryRemoved: boolean;
}

export function PodcastPageClient(props: PodcastPageClientProps) {
  const {
    hasExplicitUrlParams,
    initialQueryParams,
    ssrChannel,
    ssrItemsWithLiveItem,
    ssrItems,
    ssrClips,
    ssrItemSoundbites,
    ssrHasItemSoundbites,
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
      <PodcastPageContextProvider
        hasExplicitUrlParams={hasExplicitUrlParams}
        initialQueryParams={initialQueryParams}
        ssrChannelIdText={ssrChannel.id_text}
        ssrItemsWithLiveItem={ssrItemsWithLiveItem}
        ssrItems={ssrItems}
        ssrClips={ssrClips}
        ssrItemSoundbites={ssrItemSoundbites}
        ssrTotalPages={ssrTotalPages}
        directoryRemoved={directoryRemoved}
      >
        <MainWrapper>
          <ChannelSeenPageView channelIdText={ssrChannel.id_text} />
          <CorePodcastHeader channel={ssrChannel} />
          <MainSidebarLayout>
            <PodcastPageSideContent
              channel={ssrChannel}
              podroll={ssrPodroll}
              remoteItems={ssrRemoteItems}
            />
            <MainColumnStack>
              {directoryRemoved ? (
                <DirectoryRemovedNotice />
              ) : (
                <>
                  <PodcastPageListHeader
                    ssrHasPeople={(ssrChannel.channel_persons?.length ?? 0) > 0}
                    ssrHasPodroll={remoteItemsResponseHasRows(ssrPodroll)}
                    ssrHasRemoteItems={remoteItemsResponseHasRows(ssrRemoteItems)}
                    ssrHasItemSoundbites={ssrHasItemSoundbites}
                    ssrCanShowBoosts={ssrCanShowBoosts}
                  />
                  <PodcastPageList
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
      </PodcastPageContextProvider>
    </DirectoryRemovedProvider>
  );
}
