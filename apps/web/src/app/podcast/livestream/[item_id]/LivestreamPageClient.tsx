import type { DTOChannel, DTOItem, QueryParamsQueueMedium } from '@podverse/helpers';
import type { QueryParamsLiveItem } from '@podverse/helpers-requests';
import { MainColumnStack, MainSidebarLayout, SideContent } from '@podverse/ui';

import { CorePodcastHeader } from '../../../../components/Core/Podcast/CorePodcastHeader';
import { MainWrapper } from '../../../../components/Main/MainWrapper';
import { LivestreamHeader } from '../../../../components/Media/Livestream/LivestreamHeader';
import { getBoostEligibilityForContent } from '../../../../utils/value/boostEligibility';
import { LivestreamPageContextProvider } from './LivestreamPageContext';
import { LivestreamPageList } from './LivestreamPageList';
import { LivestreamPageListHeader } from './LivestreamPageListHeader';

interface LivestreamPageClientProps {
  initialQueryParams: QueryParamsLiveItem;
  ssrChannel: DTOChannel;
  ssrItem: DTOItem;
  medium: QueryParamsQueueMedium;
}

export function LivestreamPageClient(props: LivestreamPageClientProps) {
  const { initialQueryParams, ssrItem, ssrChannel, medium } = props;
  const { canShowBoostMessagesTab: ssrCanShowBoosts } = getBoostEligibilityForContent({
    channel: ssrChannel,
    item: ssrItem,
  });

  return (
    <LivestreamPageContextProvider initialQueryParams={initialQueryParams}>
      <MainWrapper>
        <CorePodcastHeader channel={ssrChannel} item={ssrItem} />
        <MainSidebarLayout>
          <SideContent />
          <MainColumnStack>
            <LivestreamHeader channel={ssrChannel} item={ssrItem} medium={medium} />
            <LivestreamPageListHeader ssrCanShowBoosts={ssrCanShowBoosts} />
            <LivestreamPageList
              ssrChannel={ssrChannel}
              ssrItem={ssrItem}
              medium={medium}
              ssrCanShowBoosts={ssrCanShowBoosts}
            />
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </LivestreamPageContextProvider>
  );
}
