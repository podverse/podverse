import type { DTOChannel, DTOItem, DTOItemSoundbite } from '@podverse/helpers';
import { MainWrapper } from '../../../components/Main/MainWrapper';
import { MainInnerWrapper } from '../../../components/Main/MainInnerWrapper';
import { MainInnerContentWrapper } from '../../../components/Main/MainInnerContentWrapper';
import { CorePodcastHeader } from '../../../components/Core/Podcast/CorePodcastHeader';
import { SideContent } from '../../../components/SideContent/SideContent';
import { ItemSoundbiteHeader } from '../../../components/Media/ItemSoundbite/ItemSoundbiteHeader';

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
