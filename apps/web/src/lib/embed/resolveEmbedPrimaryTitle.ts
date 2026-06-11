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
  showChapterTitleIcon: boolean;
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
  if (mpClip !== null) {
    return {
      title: mpClip.title ?? resolveBaseItemTitle(mpItem),
      allowTitleToggle: false,
      showChapterTitleIcon: false,
    };
  }

  if (mpItemSoundbite !== null) {
    return {
      title: mpItemSoundbite.title ?? resolveBaseItemTitle(mpItem),
      allowTitleToggle: false,
      showChapterTitleIcon: false,
    };
  }

  const chapters = mpItemChapters ?? [];
  const baseItemTitle = resolveBaseItemTitle(mpItem);
  const activeChapter =
    chapters.length > 0 ? selectItemChapterForTime(chapters, currentTimeSeconds) : null;
  const activeChapterTitle = activeChapter?.title ?? null;
  const hasChapterTitle =
    activeChapterTitle !== null && activeChapterTitle !== undefined && activeChapterTitle !== '';

  // The title toggle only does something when a chapter title is active at the current
  // playhead (it switches between the chapter title and the item title). With no active
  // chapter title (e.g. playhead 0 before the first chapter, or a gap between chapters),
  // there is nothing to toggle, so do not render the clickable affordance/pointer cursor.
  if (!hasChapterTitle) {
    return { title: baseItemTitle, allowTitleToggle: false, showChapterTitleIcon: false };
  }

  if (preferItemTitle) {
    return { title: baseItemTitle, allowTitleToggle: true, showChapterTitleIcon: false };
  }

  return {
    title: activeChapterTitle,
    allowTitleToggle: true,
    showChapterTitleIcon: true,
  };
}
