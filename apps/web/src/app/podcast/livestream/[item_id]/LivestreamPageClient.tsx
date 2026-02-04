import type { DTOChannel, DTOItem, QueryParamsQueueMedium } from '@podverse/helpers';
import type { QueryParamsLiveItem } from '@podverse/helpers-requests';
import { MainWrapper } from '../../../../components/Main/MainWrapper';
import { LivestreamPageContextProvider } from './LivestreamPageContext';
import { LivestreamPageList } from './LivestreamPageList';
import { LivestreamPageListHeader } from './LivestreamPageListHeader';
import { MainInnerWrapper } from '../../../../components/Main/MainInnerWrapper';
import { MainInnerContentWrapper } from '../../../../components/Main/MainInnerContentWrapper';
import { CorePodcastHeader } from '../../../../components/Core/Media/Podcast/CorePodcastHeader';
import { SideContent } from '../../../../components/SideContent/SideContent';
import { LivestreamHeader } from '../../../../components/Media/Livestream/LivestreamHeader';

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
