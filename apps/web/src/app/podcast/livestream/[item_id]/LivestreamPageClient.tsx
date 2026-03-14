import type { DTOChannel, DTOItem, QueryParamsQueueMedium } from '@podverse/helpers';
import type { QueryParamsLiveItem } from '@podverse/helpers-requests';

import { CorePodcastHeader } from '../../../../components/Core/Podcast/CorePodcastHeader';
import { MainInnerContentWrapper } from '../../../../components/Main/MainInnerContentWrapper';
import { MainInnerWrapper } from '../../../../components/Main/MainInnerWrapper';
import { MainWrapper } from '../../../../components/Main/MainWrapper';
import { LivestreamHeader } from '../../../../components/Media/Livestream/LivestreamHeader';
import { SideContent } from '../../../../components/SideContent/SideContent';
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

  return (
    <LivestreamPageContextProvider initialQueryParams={initialQueryParams}>
      <MainWrapper>
        <CorePodcastHeader channel={ssrChannel} item={ssrItem} />
        <MainInnerWrapper>
          <SideContent />
          <MainInnerContentWrapper>
            <LivestreamHeader channel={ssrChannel} item={ssrItem} medium={medium} />
            <LivestreamPageListHeader />
            <LivestreamPageList ssrItem={ssrItem} />
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    </LivestreamPageContextProvider>
  );
}
