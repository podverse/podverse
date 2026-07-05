import type { QueueResourcesAbridgedIndex } from '@podverse/helpers';

import { clampNearEndSeconds } from './clampNearEndSeconds.js';
import { parsePlaybackSeconds } from './parsePlaybackSeconds.js';
import type { PlaybackLoadRequest } from './playbackLoadRequest.js';
import { resumeSeekFromAbridged } from './resumeSeekFromAbridged.js';

export type PlaybackLoadDecision = {
  /** Final position the bridge should seek to once loadedmetadata fires. */
  initialSeekSeconds: number;
  /** Whether the bridge should call play() after the seek lands. */
  shouldAutoPlay: boolean;
  /** When the bridge should pause itself; undefined means no pause. */
  pauseAtSeconds?: number;
  /** Whether the bridge should clear AutoQueue after the load lands. */
  shouldClearAutoQueue: boolean;
  /** Whether the bridge should record a stat-track event after play begins. */
  shouldRecordPlaybackStat: boolean;
  /** Diagnostic / observability label; never used for control flow. */
  reason: PlaybackLoadDecisionReason;
};

export type PlaybackLoadDecisionReason =
  | 'clip-start'
  | 'soundbite-start'
  | 'chapter-start'
  | 'item-podcast-resume'
  | 'item-podcast-fresh'
  | 'item-video-resume'
  | 'item-video-fresh'
  | 'item-music-session-restore'
  | 'item-music-explicit'
  | 'item-music-fresh-transition'
  | 'add-by-rss-resume'
  | 'add-by-rss-fresh'
  | 'livestream'
  | 'enclosure-switch-resume';

export function resolvePlaybackLoadDecision(
  request: PlaybackLoadRequest,
  indices: { abridged: QueueResourcesAbridgedIndex }
): PlaybackLoadDecision {
  switch (request.target.kind) {
    case 'clip': {
      const fromClipStart = parsePlaybackSeconds(request.target.clip.start_time) ?? 0;
      const explicitParsed = parsePlaybackSeconds(request.explicitPlaybackSeconds);
      const clipRow = indices.abridged.clips[request.target.clip.id];
      const initialSeekSeconds =
        explicitParsed !== undefined
          ? explicitParsed
          : parsePlaybackSeconds(clipRow?.p) !== undefined
            ? resumeSeekFromAbridged({
                abridged: clipRow,
                explicitSeconds: undefined,
                durationHintSeconds: undefined,
              })
            : fromClipStart;
      const clipEndSeconds = parsePlaybackSeconds(request.target.clip.end_time);
      return baseDecision({
        initialSeekSeconds,
        pauseAtSeconds: clipEndSeconds !== undefined ? clipEndSeconds + 1 : undefined,
        reason: 'clip-start',
      });
    }
    case 'soundbite': {
      const fromStart = parsePlaybackSeconds(request.target.soundbite.start_time) ?? 0;
      const explicitParsed = parsePlaybackSeconds(request.explicitPlaybackSeconds);
      const soundbiteRow = indices.abridged.item_soundbites[request.target.soundbite.id];
      const initialSeekSeconds =
        explicitParsed !== undefined
          ? explicitParsed
          : parsePlaybackSeconds(soundbiteRow?.p) !== undefined
            ? resumeSeekFromAbridged({
                abridged: soundbiteRow,
                explicitSeconds: undefined,
                durationHintSeconds: undefined,
              })
            : fromStart;
      const durationSeconds = parsePlaybackSeconds(request.target.soundbite.duration) ?? 0;
      return baseDecision({
        initialSeekSeconds,
        pauseAtSeconds: fromStart + durationSeconds + 1,
        reason: 'soundbite-start',
      });
    }
    case 'chapter': {
      const fromChapterStart = parsePlaybackSeconds(request.target.chapter.start_time) ?? 0;
      const initialSeekSeconds =
        parsePlaybackSeconds(request.explicitPlaybackSeconds) ?? fromChapterStart;
      const chapterEndSeconds = parsePlaybackSeconds(request.target.chapter.end_time);
      return baseDecision({
        initialSeekSeconds,
        pauseAtSeconds: chapterEndSeconds !== undefined ? chapterEndSeconds + 1 : undefined,
        reason: 'chapter-start',
      });
    }
    case 'item-podcast':
      return itemDecision({
        abridged: indices.abridged.items[request.target.item.id],
        explicitSeconds: request.explicitPlaybackSeconds,
        mediaFileDurationHintSeconds: request.mediaFileDurationHintSeconds,
        resumeReason: 'item-podcast-resume',
        freshReason: 'item-podcast-fresh',
      });
    case 'item-video':
      return itemDecision({
        abridged: indices.abridged.items[request.target.item.id],
        explicitSeconds: request.explicitPlaybackSeconds,
        mediaFileDurationHintSeconds: request.mediaFileDurationHintSeconds,
        resumeReason: 'item-video-resume',
        freshReason: 'item-video-fresh',
      });
    case 'item-music':
      if (request.target.intent === 'session_restore') {
        const abridged = indices.abridged.items[request.target.item.id];
        return {
          ...baseDecision({
            initialSeekSeconds: resumeSeekFromAbridged({
              abridged,
              durationHintSeconds: request.mediaFileDurationHintSeconds,
              explicitSeconds: request.explicitPlaybackSeconds,
            }),
            reason: 'item-music-session-restore',
            shouldClearAutoQueue: false,
          }),
          shouldRecordPlaybackStat: false,
        };
      }

      if (request.target.intent === 'explicit_play') {
        return baseDecision({
          initialSeekSeconds: 0,
          reason: 'item-music-explicit',
        });
      }

      return baseDecision({
        initialSeekSeconds: 0,
        reason: 'item-music-fresh-transition',
        shouldClearAutoQueue: false,
      });
    case 'add-by-rss': {
      const fromResource = parsePlaybackSeconds(request.target.resourceData.playback_position);
      const fromExplicit = parsePlaybackSeconds(request.explicitPlaybackSeconds);
      const rawSeek = fromExplicit ?? fromResource ?? 0;
      const durationHint = parsePlaybackSeconds(request.mediaFileDurationHintSeconds) ?? 0;
      const initialSeekSeconds =
        durationHint > 0
          ? clampNearEndSeconds({
              currentSeconds: rawSeek,
              durationSeconds: durationHint,
            })
          : rawSeek;
      return {
        ...baseDecision({
          initialSeekSeconds,
          reason: initialSeekSeconds > 0 ? 'add-by-rss-resume' : 'add-by-rss-fresh',
        }),
        shouldRecordPlaybackStat: false,
      };
    }
    case 'livestream':
      return baseDecision({
        initialSeekSeconds: 0,
        reason: 'livestream',
      });
  }
}

function baseDecision({
  initialSeekSeconds,
  pauseAtSeconds,
  reason,
  shouldClearAutoQueue = true,
}: {
  initialSeekSeconds: number;
  pauseAtSeconds?: number;
  reason: PlaybackLoadDecisionReason;
  shouldClearAutoQueue?: boolean;
}): PlaybackLoadDecision {
  return {
    initialSeekSeconds,
    pauseAtSeconds,
    reason,
    shouldAutoPlay: true,
    shouldClearAutoQueue,
    shouldRecordPlaybackStat: true,
  };
}

function itemDecision({
  abridged,
  explicitSeconds,
  freshReason,
  mediaFileDurationHintSeconds,
  resumeReason,
}: {
  abridged: { p?: unknown; d?: unknown } | null | undefined;
  explicitSeconds?: unknown;
  freshReason: PlaybackLoadDecisionReason;
  mediaFileDurationHintSeconds?: unknown;
  resumeReason: PlaybackLoadDecisionReason;
}): PlaybackLoadDecision {
  const initialSeekSeconds = resumeSeekFromAbridged({
    abridged,
    durationHintSeconds: mediaFileDurationHintSeconds,
    explicitSeconds,
  });
  return baseDecision({
    initialSeekSeconds,
    reason: initialSeekSeconds > 0 ? resumeReason : freshReason,
  });
}
