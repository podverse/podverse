import type { DTOChannel, DTOClip, DTOItem } from '@podverse/helpers';
import { MainColumnStack, MainSidebarLayout, SideContent } from '@podverse/ui';

import { CorePodcastHeader } from '../../../components/Core/Podcast/CorePodcastHeader';
import { MainWrapper } from '../../../components/Main/MainWrapper';
import { ClipHeader } from '../../../components/Media/Clip/ClipHeader';

interface ClipPageClientProps {
  ssrChannel: DTOChannel;
  ssrClip: DTOClip;
  ssrItem: DTOItem;
}

export function ClipPageClient(props: ClipPageClientProps) {
  const { ssrChannel, ssrClip, ssrItem } = props;
  const headerShareClip: DTOClip = {
    id_text: ssrClip.id_text,
    id: ssrClip.id,
    account: ssrClip.account,
    item_id: ssrClip.item_id,
    item: ssrItem,
    start_time: ssrClip.start_time,
    end_time: ssrClip.end_time,
    title: ssrClip.title,
    description: ssrClip.description,
    sharable_status: ssrClip.sharable_status,
  };

  return (
    <MainWrapper>
      <CorePodcastHeader channel={ssrChannel} item={ssrItem} clip={headerShareClip} />
      <MainSidebarLayout>
        <SideContent />
        <MainColumnStack>
          <ClipHeader channel={ssrChannel} item={ssrItem} clip={ssrClip} />
        </MainColumnStack>
      </MainSidebarLayout>
    </MainWrapper>
  );
}
