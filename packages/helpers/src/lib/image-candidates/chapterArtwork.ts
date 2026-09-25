type ChapterImageSource = {
  id_text?: string;
  img?: string | null;
};

export type ChapterRowArtwork = { show: false } | { show: true; uri: string | null };

export const resolveChapterImageUrl = (img: string | null | undefined): string | null => {
  if (typeof img !== 'string') {
    return null;
  }
  const trimmed = img.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const chapterSectionHasImages = (chapters: readonly ChapterImageSource[]): boolean =>
  chapters.some((chapter) => resolveChapterImageUrl(chapter.img) !== null);

export const resolveChapterRowArtwork = (
  chapter: ChapterImageSource,
  fallbackUrl: string | null,
  sectionHasImages: boolean
): ChapterRowArtwork => {
  if (!sectionHasImages) {
    return { show: false };
  }
  return { show: true, uri: resolveChapterImageUrl(chapter.img) ?? fallbackUrl };
};

export const resolveActiveChapterImageUrl = (
  activeChapter: ChapterImageSource | null,
  chapters: readonly ChapterImageSource[]
): string | null => {
  if (activeChapter === null) {
    return null;
  }
  const own = resolveChapterImageUrl(activeChapter.img);
  if (own !== null) {
    return own;
  }
  if (typeof activeChapter.id_text !== 'string' || activeChapter.id_text.length === 0) {
    return null;
  }
  const match = chapters.find((chapter) => chapter.id_text === activeChapter.id_text);
  return match === undefined ? null : resolveChapterImageUrl(match.img);
};
