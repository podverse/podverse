import type { DTOChannel, DTOItem } from '@podverse/helpers';
import type { QueryParamsItem } from '@podverse/helpers-requests';
import { MainWrapper } from '../../../components/Main/MainWrapper';
import { EpisodePageContextProvider } from './EpisodePageContext';
import { EpisodePageList } from './EpisodePageList';
import { EpisodePageListHeader } from './EpisodePageListHeader';
import { MainInnerWrapper } from '../../../components/Main/MainInnerWrapper';
import { MainInnerContentWrapper } from '../../../components/Main/MainInnerContentWrapper';
import { CorePodcastHeader } from '../../../components/Core/Podcast/CorePodcastHeader';
import { SideContent } from '../../../components/SideContent/SideContent';
import { CoreEpisodeHeader } from '../../../components/Core/Podcast/Episodes/CoreEpisodeHeader';

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

  return (
    <EpisodePageContextProvider initialQueryParams={initialQueryParams}>
      <MainWrapper>
        <CorePodcastHeader channel={ssrChannel} item={ssrItem} />
        <MainInnerWrapper>
          <SideContent />
          <MainInnerContentWrapper>
            <CoreEpisodeHeader channel={ssrChannel} item={ssrItem} />
            <EpisodePageListHeader
              ssrHasChapters={ssrHasChapters}
              ssrHasTranscripts={ssrHasTranscripts}
              ssrHasSoundbites={ssrHasSoundbites}
            />
            <EpisodePageList ssrChannel={ssrChannel} ssrItem={ssrItem} />
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    </EpisodePageContextProvider>
  );
}
