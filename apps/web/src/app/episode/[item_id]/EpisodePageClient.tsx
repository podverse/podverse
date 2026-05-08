import type { DTOChannel, DTOItem } from '@podverse/helpers';
import type { QueryParamsItem } from '@podverse/helpers-requests';
import { MainColumnStack, MainSidebarLayout, SideContent } from '@podverse/ui';

import { CorePodcastHeader } from '../../../components/Core/Podcast/CorePodcastHeader';
import { CoreEpisodeHeader } from '../../../components/Core/Podcast/Episodes/CoreEpisodeHeader';
import { MainWrapper } from '../../../components/Main/MainWrapper';
import { getBoostEligibilityForContent } from '../../../utils/value/boostEligibility';
import { EpisodePageContextProvider } from './EpisodePageContext';
import { EpisodePageList } from './EpisodePageList';
import { EpisodePageListHeader } from './EpisodePageListHeader';

interface EpisodePageClientProps {
  initialQueryParams: QueryParamsItem;
  ssrChannel: DTOChannel;
  ssrItem: DTOItem;
  ssrHasChapters: boolean;
  ssrHasSoundbites: boolean;
  ssrHasTranscripts: boolean;
}

export function EpisodePageClient(props: EpisodePageClientProps) {
  const {
    initialQueryParams,
    ssrItem,
    ssrChannel,
    ssrHasChapters,
    ssrHasSoundbites,
    ssrHasTranscripts,
  } = props;
  const { canShowBoostMessagesTab: ssrCanShowBoosts } = getBoostEligibilityForContent({
    channel: ssrChannel,
    item: ssrItem,
  });

  return (
    <EpisodePageContextProvider initialQueryParams={initialQueryParams}>
      <MainWrapper>
        <CorePodcastHeader channel={ssrChannel} item={ssrItem} />
        <MainSidebarLayout>
          <SideContent />
          <MainColumnStack>
            <CoreEpisodeHeader channel={ssrChannel} item={ssrItem} />
            <EpisodePageListHeader
              ssrHasChapters={ssrHasChapters}
              ssrHasTranscripts={ssrHasTranscripts}
              ssrHasSoundbites={ssrHasSoundbites}
              ssrCanShowBoosts={ssrCanShowBoosts}
            />
            <EpisodePageList
              ssrChannel={ssrChannel}
              ssrItem={ssrItem}
              ssrCanShowBoosts={ssrCanShowBoosts}
            />
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </EpisodePageContextProvider>
  );
}
