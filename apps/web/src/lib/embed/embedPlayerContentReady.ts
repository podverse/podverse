import type { DTOItem } from '@podverse/helpers';

import type { EmbedMediaType } from './embedTypes';
import type { EmbedSingleResourcePayload } from './fetchEmbedSingleResource';
import { formatEmbedDisplayTitle } from './formatEmbedDisplayTitle';

export function getEmbedResourceIdentity(
  resource: EmbedSingleResourcePayload | null
): string | null {
  if (resource === null) {
    return null;
  }

  if (resource.clip?.id_text !== undefined && resource.clip.id_text !== '') {
    return `clip:${resource.clip.id_text}`;
  }

  if (resource.itemChapter?.id_text !== undefined && resource.itemChapter.id_text !== '') {
    return `chapter:${resource.itemChapter.id_text}`;
  }

  if (resource.itemSoundbite?.id_text !== undefined && resource.itemSoundbite.id_text !== '') {
    return `soundbite:${resource.itemSoundbite.id_text}`;
  }

  if (resource.item.id_text !== undefined && resource.item.id_text !== '') {
    return `item:${resource.item.id_text}`;
  }

  return null;
}

export function getLoadedEmbedResourceIdentity(input: {
  mpItem: DTOItem | null;
  mpClip: EmbedSingleResourcePayload['clip'];
  mpItemChapter: EmbedSingleResourcePayload['itemChapter'];
  mpItemSoundbite: EmbedSingleResourcePayload['itemSoundbite'];
}): string | null {
  if (input.mpClip?.id_text !== undefined && input.mpClip.id_text !== '') {
    return `clip:${input.mpClip.id_text}`;
  }

  if (input.mpItemChapter?.id_text !== undefined && input.mpItemChapter.id_text !== '') {
    return `chapter:${input.mpItemChapter.id_text}`;
  }

  if (input.mpItemSoundbite?.id_text !== undefined && input.mpItemSoundbite.id_text !== '') {
    return `soundbite:${input.mpItemSoundbite.id_text}`;
  }

  if (input.mpItem?.id_text !== undefined && input.mpItem.id_text !== '') {
    return `item:${input.mpItem.id_text}`;
  }

  return null;
}

export function embedFallbackHasDisplayContent(
  resource: EmbedSingleResourcePayload | null
): boolean {
  if (resource === null) {
    return false;
  }

  const channelTitle = resource.channel.title ?? '';
  const itemTitle = formatEmbedDisplayTitle(resource);

  return channelTitle !== '' || itemTitle !== '';
}

export function isEmbedPlayerContentReady(input: {
  fallbackResource: EmbedSingleResourcePayload | null;
  headerTitle?: string | null;
  mediaType: EmbedMediaType;
  mpChannel: EmbedSingleResourcePayload['channel'] | null;
  mpItem: DTOItem | null;
}): boolean {
  if (embedFallbackHasDisplayContent(input.fallbackResource)) {
    return true;
  }

  const headerTitle = input.headerTitle ?? '';
  if (headerTitle !== '') {
    return true;
  }

  if (input.mediaType === 'video') {
    return true;
  }

  return input.mpChannel !== null || input.mpItem !== null;
}
