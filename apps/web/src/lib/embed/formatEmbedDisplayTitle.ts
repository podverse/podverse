import type { EmbedSingleResourcePayload } from './fetchEmbedSingleResource';

export function formatEmbedDisplayTitle(resource: EmbedSingleResourcePayload): string {
  const itemTitle = resource.item.title ?? '';

  if (resource.itemChapter !== null) {
    const chapterTitle = resource.itemChapter.title ?? '';

    if (itemTitle !== '' && chapterTitle !== '') {
      return `${itemTitle} — ${chapterTitle}`;
    }

    return chapterTitle !== '' ? chapterTitle : itemTitle;
  }

  if (resource.clip?.title) {
    return resource.clip.title;
  }

  if (resource.itemSoundbite?.title) {
    return resource.itemSoundbite.title;
  }

  return itemTitle;
}
