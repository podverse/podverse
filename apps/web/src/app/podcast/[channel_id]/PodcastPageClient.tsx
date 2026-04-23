import type {
  DTOChannel,
  DTOClip,
  DTOItem,
  DTOItemSoundbite,
  RemoteItemsResponse,
} from '@podverse/helpers';
import type { QueryParamsChannel } from '@podverse/helpers-requests';

import { CorePodcastHeader } from '../../../components/Core/Podcast/CorePodcastHeader';
import { MainInnerContentWrapper } from '../../../components/Main/MainInnerContentWrapper';
import { MainInnerWrapper } from '../../../components/Main/MainInnerWrapper';
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
        <CorePodcastHeader channel={ssrChannel} />
        <MainInnerWrapper>
          <PodcastPageSideContent channel={ssrChannel} podroll={ssrPodroll} />
          <MainInnerContentWrapper>
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
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    </PodcastPageContextProvider>
  );
}
