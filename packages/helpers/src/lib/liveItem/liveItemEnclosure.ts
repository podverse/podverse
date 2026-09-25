import type { DTOItem, DTOItemEnclosure } from '../../dtos/index.js';
import { isHlsSource } from '../item/mediaSourceClassification.js';

export function getLiveItemEnclosureSource(item: DTOItem | null): {
  url: string | null;
  type: string;
  isAudioHLS: boolean;
  isVideoHLS: boolean;
} | null {
  if (!item?.live_item) {
    return null;
  }

  const enclosures = item.item_enclosures || [];
  const defaultEnclosure =
    enclosures.find((e: DTOItemEnclosure) => e.item_enclosure_default) || enclosures[0];

  const source = defaultEnclosure?.item_enclosure_sources?.[0];
  if (!source?.uri) {
    return { url: null, type: '', isAudioHLS: false, isVideoHLS: false };
  }

  const rawEnclosureType = defaultEnclosure?.type || source?.content_type || '';
  if (isHlsSource(source.uri, rawEnclosureType !== '' ? rawEnclosureType : null)) {
    const codecs = defaultEnclosure?.codecs || '';
    const isAudioHLS =
      (typeof rawEnclosureType === 'string' && rawEnclosureType.includes('audio')) ||
      (typeof codecs === 'string' && !!codecs.match(/mp4a|aac|opus|vorbis|flac|alac|pcm/i));
    return {
      url: source.uri,
      type: 'application/x-mpegURL',
      isAudioHLS,
      isVideoHLS: !isAudioHLS,
    };
  }

  const enclosureType = rawEnclosureType || 'audio';

  if (typeof enclosureType === 'string' && enclosureType.includes('video')) {
    return {
      url: source.uri,
      type: 'video/mp4',
      isAudioHLS: false,
      isVideoHLS: true,
    };
  }

  if (typeof enclosureType === 'string' && enclosureType.includes('audio')) {
    return {
      url: source.uri,
      type: 'audio/mpeg',
      isAudioHLS: true,
      isVideoHLS: false,
    };
  }

  return {
    url: source.uri,
    type: 'audio/mpeg',
    isAudioHLS: true,
    isVideoHLS: false,
  };
}
