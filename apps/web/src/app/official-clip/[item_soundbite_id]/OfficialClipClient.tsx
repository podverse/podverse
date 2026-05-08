import type { DTOChannel, DTOItem, DTOItemSoundbite } from '@podverse/helpers';
import { MainColumnStack, MainSidebarLayout, SideContent } from '@podverse/ui';

import { CorePodcastHeader } from '../../../components/Core/Podcast/CorePodcastHeader';
import { MainWrapper } from '../../../components/Main/MainWrapper';
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
      <MainSidebarLayout>
        <SideContent />
        <MainColumnStack>
          <ItemSoundbiteHeader
            channel={ssrChannel}
            item={ssrItem}
            item_soundbite={ssrItemSoundbite}
          />
        </MainColumnStack>
      </MainSidebarLayout>
    </MainWrapper>
  );
}
