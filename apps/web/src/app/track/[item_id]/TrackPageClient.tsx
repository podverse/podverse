import type { DTOChannel, DTOItem } from '@podverse/helpers';
import type { QueryParamsItemMusic } from '@podverse/helpers-requests';

import { CoreAlbumHeader } from '../../../components/Core/Artist/Album/CoreAlbumHeader';
import { CoreTrackHeader } from '../../../components/Core/Artist/Album/Track/CoreTrackHeader';
import { MainInnerContentWrapper } from '../../../components/Main/MainInnerContentWrapper';
import { MainInnerWrapper } from '../../../components/Main/MainInnerWrapper';
import { MainWrapper } from '../../../components/Main/MainWrapper';
import { SideContent } from '../../../components/SideContent/SideContent';
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
        <MainInnerWrapper>
          <SideContent />
          <MainInnerContentWrapper>
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
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    </TrackPageContextProvider>
  );
}
