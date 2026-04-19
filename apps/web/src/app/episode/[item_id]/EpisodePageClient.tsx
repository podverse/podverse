import type { DTOChannel, DTOItem } from '@podverse/helpers';
import type { QueryParamsItem } from '@podverse/helpers-requests';
import { resolveMetaBoostFromApiValueMetadata } from '@podverse/v4v-metaboost';

import { CorePodcastHeader } from '../../../components/Core/Podcast/CorePodcastHeader';
import { CoreEpisodeHeader } from '../../../components/Core/Podcast/Episodes/CoreEpisodeHeader';
import { MainInnerContentWrapper } from '../../../components/Main/MainInnerContentWrapper';
import { MainInnerWrapper } from '../../../components/Main/MainInnerWrapper';
import { MainWrapper } from '../../../components/Main/MainWrapper';
import { SideContent } from '../../../components/SideContent/SideContent';
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
  const resolvedMetaBoost = resolveMetaBoostFromApiValueMetadata(ssrChannel.channel_meta_boost);
  const ssrCanShowBoosts =
    resolvedMetaBoost?.metaBoost.standard === 'mbrss-v1' &&
    Boolean(ssrChannel.podcast_guid) &&
    Boolean(ssrItem.guid);

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
              ssrCanShowBoosts={ssrCanShowBoosts}
            />
            <EpisodePageList ssrChannel={ssrChannel} ssrItem={ssrItem} />
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    </EpisodePageContextProvider>
  );
}
