import type { DTOClip, DTOItem, DTOItemChapter, DTOItemSoundbite } from '@podverse/helpers';

import { selectItemChapterForTime } from '../../utils/mediaPlayer/selectItemChapterForTime';

export type ResolveEmbedPrimaryTitleInput = {
  mpItem: DTOItem | null;
  mpClip: DTOClip | null;
  mpItemSoundbite: DTOItemSoundbite | null;
  mpItemChapters: DTOItemChapter[] | null;
  currentTimeSeconds: number;
  preferItemTitle: boolean;
};

export type ResolveEmbedPrimaryTitleResult = {
  title: string | null;
  allowTitleToggle: boolean;
};

function resolveBaseItemTitle(mpItem: DTOItem | null): string | null {
  return mpItem?.title ?? null;
}

/**
 * Embed-only primary title line: time-based chapter title by default when chapters
 * exist; clip/soundbite titles take precedence without toggle.
 */
export function resolveEmbedPrimaryTitle({
  mpItem,
  mpClip,
  mpItemSoundbite,
  mpItemChapters,
  currentTimeSeconds,
  preferItemTitle,
}: ResolveEmbedPrimaryTitleInput): ResolveEmbedPrimaryTitleResult {
  if (mpClip?.title) {
    return { title: mpClip.title, allowTitleToggle: false };
  }

  if (mpItemSoundbite?.title) {
    return { title: mpItemSoundbite.title, allowTitleToggle: false };
  }

  const chapters = mpItemChapters ?? [];
  const baseItemTitle = resolveBaseItemTitle(mpItem);
  const activeChapter =
    chapters.length > 0 ? selectItemChapterForTime(chapters, currentTimeSeconds) : null;
  const activeChapterTitle = activeChapter?.title ?? null;
  const hasChapterTitle =
    activeChapterTitle !== null && activeChapterTitle !== undefined && activeChapterTitle !== '';

  if (chapters.length === 0) {
    return { title: baseItemTitle, allowTitleToggle: false };
  }

  if (preferItemTitle) {
    return { title: baseItemTitle, allowTitleToggle: true };
  }

  if (hasChapterTitle) {
    return { title: activeChapterTitle, allowTitleToggle: true };
  }

  return { title: baseItemTitle, allowTitleToggle: true };
}
