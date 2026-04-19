import type {
  DTOChannel,
  DTOClip,
  DTOItem,
  DTOItemSoundbite,
  RemoteItemsResponse,
} from '@podverse/helpers';
import type { QueryParamsChannel } from '@podverse/helpers-requests';
import { resolveMetaBoostFromApiValueMetadata } from '@podverse/v4v-metaboost';

import { CorePodcastHeader } from '../../../components/Core/Podcast/CorePodcastHeader';
import { MainInnerContentWrapper } from '../../../components/Main/MainInnerContentWrapper';
import { MainInnerWrapper } from '../../../components/Main/MainInnerWrapper';
import { MainWrapper } from '../../../components/Main/MainWrapper';
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
  const resolvedMetaBoost = resolveMetaBoostFromApiValueMetadata(ssrChannel.channel_meta_boost);
  const ssrCanShowBoosts =
    resolvedMetaBoost?.metaBoost.standard === 'mbrss-v1' && Boolean(ssrChannel.podcast_guid);

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
            <PodcastPageList ssrChannel={ssrChannel} podroll={ssrPodroll} />
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    </PodcastPageContextProvider>
  );
}
