import type { DTOChannel, DTOItem } from '@podverse/helpers';
import type { QueryParamsItemMusic } from '@podverse/helpers-requests';
import { MainWrapper } from '../../../components/Main/MainWrapper';
import { TrackPageContextProvider } from './TrackPageContext';
import { TrackPageList } from './TrackPageList';
import { TrackPageListHeader } from './TrackPageListHeader';
import { MainInnerWrapper } from '../../../components/Main/MainInnerWrapper';
import { MainInnerContentWrapper } from '../../../components/Main/MainInnerContentWrapper';
import { SideContent } from '../../../components/SideContent/SideContent';
import { AlbumHeader } from '../../../components/Media/Music/Album/AlbumHeader';
import { TrackHeader } from '../../../components/Media/Music/Album/Track/TrackHeader';

interface TrackPageClientProps {
  initialQueryParams: QueryParamsItemMusic;
  ssrChannel: DTOChannel;
  ssrItem: DTOItem;
  ssrHasTranscripts: boolean;
}

export function TrackPageClient(props: TrackPageClientProps) {
  const { initialQueryParams, ssrItem, ssrChannel, ssrHasTranscripts } = props;

  return (
    <TrackPageContextProvider initialQueryParams={initialQueryParams}>
      <MainWrapper>
        <AlbumHeader channel={ssrChannel} item={ssrItem} />
        <MainInnerWrapper>
          <SideContent />
          <MainInnerContentWrapper>
            <TrackHeader channel={ssrChannel} item={ssrItem} />
            <TrackPageListHeader ssrHasTranscripts={ssrHasTranscripts} />
            <TrackPageList ssrItem={ssrItem} />
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    </TrackPageContextProvider>
  );
}
