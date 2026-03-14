import type { DTOChannel, DTOItem, DTOItemSoundbite } from '@podverse/helpers';

import { CorePodcastHeader } from '../../../components/Core/Podcast/CorePodcastHeader';
import { MainInnerContentWrapper } from '../../../components/Main/MainInnerContentWrapper';
import { MainInnerWrapper } from '../../../components/Main/MainInnerWrapper';
import { MainWrapper } from '../../../components/Main/MainWrapper';
import { ItemSoundbiteHeader } from '../../../components/Media/ItemSoundbite/ItemSoundbiteHeader';
import { SideContent } from '../../../components/SideContent/SideContent';

interface OfficialClipClientProps {
  ssrChannel: DTOChannel;
  ssrItem: DTOItem;
  ssrItemSoundbite: DTOItemSoundbite;
}

export function OfficialClipClient(props: OfficialClipClientProps) {
  const { ssrChannel, ssrItem, ssrItemSoundbite } = props;

  return (
    <MainWrapper>
      <CorePodcastHeader channel={ssrChannel} item={ssrItem} item_soundbite={ssrItemSoundbite} />
      <MainInnerWrapper>
        <SideContent />
        <MainInnerContentWrapper>
          <ItemSoundbiteHeader
            channel={ssrChannel}
            item={ssrItem}
            item_soundbite={ssrItemSoundbite}
          />
        </MainInnerContentWrapper>
      </MainInnerWrapper>
    </MainWrapper>
  );
}
