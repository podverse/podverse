import type { DTOChannel, DTOItem } from '@podverse/helpers';
import type { QueryParamsItem } from '@podverse/helpers-requests';
import { MainColumnStack, MainSidebarLayout, SideContent } from '@podverse/ui';
import { getBoostEligibilityForContent } from '@podverse/v4v-metaboost';

import { CorePodcastHeader } from '../../../components/Core/Podcast/CorePodcastHeader';
import { CoreEpisodeHeader } from '../../../components/Core/Podcast/Episodes/CoreEpisodeHeader';
import { MainWrapper } from '../../../components/Main/MainWrapper';
import { EpisodePageContextProvider } from './EpisodePageContext';
import { EpisodePageList } from './EpisodePageList';
import { EpisodePageListHeader } from './EpisodePageListHeader';

interface EpisodePageClientProps {
  hasExplicitUrlParams: boolean;
  initialQueryParams: QueryParamsItem;
  ssrChannel: DTOChannel;
  ssrItem: DTOItem;
  ssrHasChapters: boolean;
  ssrHasSoundbites: boolean;
  ssrHasTranscripts: boolean;
}

export function EpisodePageClient(props: EpisodePageClientProps) {
  const {
    hasExplicitUrlParams,
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
    <EpisodePageContextProvider
      hasExplicitUrlParams={hasExplicitUrlParams}
      initialQueryParams={initialQueryParams}
      ssrItemIdText={ssrItem.id_text}
    >
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
