import { resolveActiveChapterImageUrl, shouldUseChapterArtwork } from '@podverse/helpers';
import type { DTOItemChapter } from '@podverse/helpers/dto';

export const resolvePlayerChapterArtworkUri = ({
  activeChapter,
  chapters,
  fallbackUri,
  mpClip,
  mpItemSoundbite,
}: {
  activeChapter: DTOItemChapter | null;
  chapters: DTOItemChapter[];
  fallbackUri: string | null;
  mpClip: object | null;
  mpItemSoundbite: object | null;
}): string | null => {
  const useChapterArt = shouldUseChapterArtwork({
    mpClip,
    mpItemChapter: activeChapter,
    mpItemSoundbite,
  });
  const chapterImg = useChapterArt ? resolveActiveChapterImageUrl(activeChapter, chapters) : null;
  return chapterImg ?? fallbackUri;
};
