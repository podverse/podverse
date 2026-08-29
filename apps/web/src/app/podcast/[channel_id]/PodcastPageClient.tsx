import type {
  DTOChannel,
  DTOClip,
  DTOItem,
  DTOItemSoundbite,
  RemoteItemsResponse,
} from '@podverse/helpers';
import type { QueryParamsChannel } from '@podverse/helpers-requests';
import { MainColumnStack, MainSidebarLayout } from '@podverse/ui';

import { ChannelSeenPageView } from '../../../components/ChannelSeen/ChannelSeenPageView';
import { CorePodcastHeader } from '../../../components/Core/Podcast/CorePodcastHeader';
import { MainWrapper } from '../../../components/Main/MainWrapper';
import { getBoostEligibilityForContent } from '../../../utils/value/boostEligibility';
import { PodcastPageContextProvider } from './PodcastPageContext';
import { PodcastPageList } from './PodcastPageList';
import { PodcastPageListHeader } from './PodcastPageListHeader';
import { PodcastPageSideContent } from './PodcastPageSideContent';

interface PodcastPageClientProps {
  initialQueryParams: QueryParamsChannel;
  ssrChannel: DTOChannel;
  ssrItemsWithLiveItem: DTOItem[];
  ssrItems: DTOItem[];
  ssrItemSoundbites: DTOItemSoundbite[];
  ssrHasItemSoundbites: boolean;
  ssrClips: DTOClip[];
  ssrTotalPages: number;
  ssrPodroll: RemoteItemsResponse | null;
}

export function PodcastPageClient(props: PodcastPageClientProps) {
  const {
    initialQueryParams,
    ssrChannel,
    ssrItemsWithLiveItem,
    ssrItems,
    ssrClips,
    ssrItemSoundbites,
    ssrHasItemSoundbites,
    ssrTotalPages,
    ssrPodroll,
  } = props;
  const { canShowBoostMessagesTab: ssrCanShowBoosts } = getBoostEligibilityForContent({
    channel: ssrChannel,
    item: null,
  });

  return (
    <PodcastPageContextProvider
      initialQueryParams={initialQueryParams}
      ssrItemsWithLiveItem={ssrItemsWithLiveItem}
      ssrItems={ssrItems}
      ssrClips={ssrClips}
      ssrItemSoundbites={ssrItemSoundbites}
      ssrTotalPages={ssrTotalPages}
    >
      <MainWrapper>
        <ChannelSeenPageView channelIdText={ssrChannel.id_text} />
        <CorePodcastHeader channel={ssrChannel} />
        <MainSidebarLayout>
          <PodcastPageSideContent channel={ssrChannel} podroll={ssrPodroll} />
          <MainColumnStack>
            <PodcastPageListHeader
              ssrHasPodroll={!!ssrPodroll}
              ssrHasItemSoundbites={ssrHasItemSoundbites}
              ssrCanShowBoosts={ssrCanShowBoosts}
            />
            <PodcastPageList
              ssrChannel={ssrChannel}
              podroll={ssrPodroll}
              ssrCanShowBoosts={ssrCanShowBoosts}
            />
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </PodcastPageContextProvider>
  );
}
