import type { DTOChannel, DTOItem, DTOItemChapter } from '@podverse/helpers';
import { MainColumnStack, MainSidebarLayout, SideContent } from '@podverse/ui';

import { CorePodcastHeader } from '../../../components/Core/Podcast/CorePodcastHeader';
import { MainWrapper } from '../../../components/Main/MainWrapper';
import { ItemChapterHeader } from '../../../components/Media/ItemChapter/ItemChapterHeader';

interface ChapterClientProps {
  ssrChannel: DTOChannel;
  ssrItem: DTOItem;
  ssrItemChapter: DTOItemChapter;
}

export function ChapterClient(props: ChapterClientProps) {
  const { ssrChannel, ssrItem, ssrItemChapter } = props;

  return (
    <MainWrapper>
      <CorePodcastHeader channel={ssrChannel} item={ssrItem} item_chapter={ssrItemChapter} />
      <MainSidebarLayout>
        <SideContent />
        <MainColumnStack>
          <ItemChapterHeader channel={ssrChannel} item={ssrItem} item_chapter={ssrItemChapter} />
        </MainColumnStack>
      </MainSidebarLayout>
    </MainWrapper>
  );
}
