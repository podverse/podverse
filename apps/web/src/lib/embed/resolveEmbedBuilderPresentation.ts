import type { EmbedBuilderPresentation, EmbedBuilderType } from './embedBuilderTypes';

export function resolveEmbedBuilderPresentation(type: EmbedBuilderType): EmbedBuilderPresentation {
  switch (type) {
    case 'audio':
      return { layout: 'single', presentation: 'audio' };
    case 'video':
      return { layout: 'single', presentation: 'video' };
    case 'audio-list':
      return { layout: 'list', presentation: 'audio' };
    case 'video-list':
      return { layout: 'list', presentation: 'video' };
  }
}

export function isEmbedBuilderListType(type: EmbedBuilderType): boolean {
  return type === 'audio-list' || type === 'video-list';
}

export function defaultAutoplayForEmbedBuilderType(type: EmbedBuilderType): boolean {
  return isEmbedBuilderListType(type);
}
