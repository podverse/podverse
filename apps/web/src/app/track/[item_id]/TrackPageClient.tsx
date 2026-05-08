import type { DTOChannel, DTOItem } from '@podverse/helpers';
import type { QueryParamsItemMusic } from '@podverse/helpers-requests';
import { MainColumnStack, MainSidebarLayout, SideContent } from '@podverse/ui';

import { CoreAlbumHeader } from '../../../components/Core/Artist/Album/CoreAlbumHeader';
import { CoreTrackHeader } from '../../../components/Core/Artist/Album/Track/CoreTrackHeader';
import { MainWrapper } from '../../../components/Main/MainWrapper';
import { getBoostEligibilityForContent } from '../../../utils/value/boostEligibility';
import { TrackPageContextProvider } from './TrackPageContext';
import { TrackPageList } from './TrackPageList';
import { TrackPageListHeader } from './TrackPageListHeader';

interface TrackPageClientProps {
  initialQueryParams: QueryParamsItemMusic;
  ssrChannel: DTOChannel;
  ssrItem: DTOItem;
  ssrHasTranscripts: boolean;
}

export function TrackPageClient(props: TrackPageClientProps) {
  const { initialQueryParams, ssrItem, ssrChannel, ssrHasTranscripts } = props;
  const { canShowBoostMessagesTab: ssrCanShowBoosts } = getBoostEligibilityForContent({
    channel: ssrChannel,
    item: ssrItem,
  });

  return (
    <TrackPageContextProvider initialQueryParams={initialQueryParams}>
      <MainWrapper>
        <CoreAlbumHeader channel={ssrChannel} item={ssrItem} />
        <MainSidebarLayout>
          <SideContent />
          <MainColumnStack>
            <CoreTrackHeader channel={ssrChannel} item={ssrItem} />
            <TrackPageListHeader
              ssrHasTranscripts={ssrHasTranscripts}
              ssrCanShowBoosts={ssrCanShowBoosts}
            />
            <TrackPageList
              ssrChannel={ssrChannel}
              ssrItem={ssrItem}
              ssrCanShowBoosts={ssrCanShowBoosts}
            />
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </TrackPageContextProvider>
  );
}
