import type { DTOChannel, DTOClip, DTOItem } from '@podverse/helpers';

import { CorePodcastHeader } from '../../../components/Core/Podcast/CorePodcastHeader';
import { MainInnerContentWrapper } from '../../../components/Main/MainInnerContentWrapper';
import { MainInnerWrapper } from '../../../components/Main/MainInnerWrapper';
import { MainWrapper } from '../../../components/Main/MainWrapper';
import { ClipHeader } from '../../../components/Media/Clip/ClipHeader';
import { SideContent } from '../../../components/SideContent/SideContent';

interface ClipPageClientProps {
  ssrChannel: DTOChannel;
  ssrClip: DTOClip;
  ssrItem: DTOItem;
}

export function ClipPageClient(props: ClipPageClientProps) {
  const { ssrChannel, ssrClip, ssrItem } = props;

  return (
    <MainWrapper>
      <CorePodcastHeader channel={ssrChannel} item={ssrItem} clip={ssrClip} />
      <MainInnerWrapper>
        <SideContent />
        <MainInnerContentWrapper>
          <ClipHeader channel={ssrChannel} item={ssrItem} clip={ssrClip} />
        </MainInnerContentWrapper>
      </MainInnerWrapper>
    </MainWrapper>
  );
}
