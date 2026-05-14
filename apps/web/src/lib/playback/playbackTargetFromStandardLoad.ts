import type {
  DTOChannel,
  DTOClip,
  DTOItem,
  DTOItemChapter,
  DTOItemSoundbite,
} from '@podverse/helpers';
import { MediumEnum } from '@podverse/helpers';

import type { MusicItemPlaybackIntent, PlaybackTarget } from './playbackTarget';

export function playbackTargetLivestream(channel: DTOChannel, item: DTOItem): PlaybackTarget {
  return { kind: 'livestream', channel, item };
}

export type PlaybackTargetFromStandardLoadParams = {
  channel: DTOChannel;
  clip: DTOClip | null;
  item: DTOItem;
  itemChapter: DTOItemChapter | null;
  itemSoundbite: DTOItemSoundbite | null;
  musicIntent: MusicItemPlaybackIntent;
};

/**
 * Builds the `PlaybackTarget` for the common list/detail/queue row shape:
 * optional clip, soundbite, or chapter; otherwise a podcast, video, or music item.
 */
export function playbackTargetFromStandardLoad(
  params: PlaybackTargetFromStandardLoadParams
): PlaybackTarget {
  const { channel, clip, item, itemChapter, itemSoundbite, musicIntent } = params;

  if (clip !== null) {
    return { kind: 'clip', clip, item, channel };
  }
  if (itemSoundbite !== null) {
    return { kind: 'soundbite', soundbite: itemSoundbite, item, channel };
  }
  if (itemChapter !== null) {
    return { kind: 'chapter', chapter: itemChapter, item, channel };
  }

  if (channel.medium_id === MediumEnum.Music) {
    return { kind: 'item-music', item, channel, intent: musicIntent };
  }

  if (channel.medium_id === MediumEnum.Video) {
    return { kind: 'item-video', item, channel };
  }

  return { kind: 'item-podcast', item, channel };
}
