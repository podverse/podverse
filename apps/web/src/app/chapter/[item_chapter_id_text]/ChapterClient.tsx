import type { DTOChannel, DTOItem, DTOItemChapter } from '@podverse/helpers';
import { MainWrapper } from '../../../components/Main/MainWrapper';
import { MainInnerWrapper } from '../../../components/Main/MainInnerWrapper';
import { MainInnerContentWrapper } from '../../../components/Main/MainInnerContentWrapper';
import { CorePodcastHeader } from '../../../components/Core/Media/Podcast/CorePodcastHeader';
import { SideContent } from '../../../components/SideContent/SideContent';
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
      <MainInnerWrapper>
        <SideContent />
        <MainInnerContentWrapper>
          <ItemChapterHeader channel={ssrChannel} item={ssrItem} item_chapter={ssrItemChapter} />
        </MainInnerContentWrapper>
      </MainInnerWrapper>
    </MainWrapper>
  );
}
