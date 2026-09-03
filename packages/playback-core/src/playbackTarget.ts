import type {
  AddByRSSResourceData,
  DTOChannel,
  DTOClip,
  DTOItem,
  DTOItemChapter,
  DTOItemSoundbite,
} from '@podverse/helpers';

/**
 * Discriminator for the three distinct music-playback entry contexts.
 *
 * The literal-to-context mapping is:
 *
 * - `session_restore` — anonymous snapshot restore on first page load.
 * - `explicit_play` — user-triggered play from a list/detail UI, or queue
 *   load that resolves to a music item.
 * - `fresh_transition` — auto-queue advance or track-ended into the next
 *   music item.
 *
 * The "music forces currentTime = 0" rule is invariant across all three
 * intents; the discriminator exists so consumers can disambiguate stats,
 * analytics, and queue side effects without inferring intent from
 * surrounding state.
 */
export type MusicItemPlaybackIntent = 'session_restore' | 'explicit_play' | 'fresh_transition';

/**
 * The typed vocabulary describing what the media player is being asked to
 * load. Each variant captures the data needed to resolve the playback start
 * position, side effects, and pause-at logic.
 */
export type PlaybackTarget =
  | { kind: 'clip'; clip: DTOClip; item: DTOItem; channel: DTOChannel }
  | {
      kind: 'soundbite';
      soundbite: DTOItemSoundbite;
      item: DTOItem;
      channel: DTOChannel;
    }
  | {
      kind: 'chapter';
      chapter: DTOItemChapter;
      item: DTOItem;
      channel: DTOChannel;
    }
  | { kind: 'item-podcast'; item: DTOItem; channel: DTOChannel }
  | { kind: 'item-video'; item: DTOItem; channel: DTOChannel }
  | {
      kind: 'item-music';
      item: DTOItem;
      channel: DTOChannel;
      intent: MusicItemPlaybackIntent;
    }
  | { kind: 'add-by-rss'; resourceData: AddByRSSResourceData }
  | { kind: 'livestream'; channel: DTOChannel; item: DTOItem | null };

export type PlaybackTargetKind = PlaybackTarget['kind'];
