import type { DTOChannel, DTOItem, DTOItemChapter } from '@podverse/helpers';

import { CorePodcastHeader } from '../../../components/Core/Podcast/CorePodcastHeader';
import { MainInnerContentWrapper } from '../../../components/Main/MainInnerContentWrapper';
import { MainInnerWrapper } from '../../../components/Main/MainInnerWrapper';
import { MainWrapper } from '../../../components/Main/MainWrapper';
import { ItemChapterHeader } from '../../../components/Media/ItemChapter/ItemChapterHeader';
import { SideContent } from '../../../components/SideContent/SideContent';

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
      <MainInnerWrapper>
        <SideContent />
        <MainInnerContentWrapper>
          <ItemChapterHeader channel={ssrChannel} item={ssrItem} item_chapter={ssrItemChapter} />
        </MainInnerContentWrapper>
      </MainInnerWrapper>
    </MainWrapper>
  );
}
