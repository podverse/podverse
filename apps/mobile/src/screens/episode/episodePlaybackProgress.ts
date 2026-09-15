import { clampRatio } from '@podverse/helpers/math';

export type EpisodePlaybackProgress = {
  durationSeconds: number;
  positionSeconds: number;
};

export type EpisodeProgressTimeKind = 'remaining' | 'last' | 'duration' | 'none';

export const parsePlaybackSeconds = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }

  return parsed;
};

/**
 * Prefer live engine ticks while this episode is now-playing. Otherwise use the last stored
 * queue-resource position and duration, falling back to the item's own duration.
 */
export const resolveEpisodePlaybackProgress = ({
  itemDurationSeconds,
  live,
  storedDurationSeconds,
  storedPositionSeconds,
}: {
  itemDurationSeconds: number;
  live: EpisodePlaybackProgress | null;
  storedDurationSeconds: number;
  storedPositionSeconds: number;
}): EpisodePlaybackProgress => {
  if (live !== null) {
    return {
      durationSeconds:
        live.durationSeconds > 0 ? live.durationSeconds : Math.max(0, itemDurationSeconds),
      positionSeconds: Math.max(0, live.positionSeconds),
    };
  }

  const durationSeconds =
    storedDurationSeconds > 0 ? storedDurationSeconds : Math.max(0, itemDurationSeconds);

  return {
    durationSeconds,
    positionSeconds: Math.max(0, storedPositionSeconds),
  };
};

export const episodeProgressRatio = (progress: EpisodePlaybackProgress): number => {
  if (progress.durationSeconds <= 0) {
    return 0;
  }

  return clampRatio(progress.positionSeconds / progress.durationSeconds);
};

export const episodeProgressTimeKind = (
  progress: EpisodePlaybackProgress
): EpisodeProgressTimeKind => {
  if (progress.positionSeconds > 0 && progress.durationSeconds > 0) {
    return 'remaining';
  }
  if (progress.positionSeconds > 0) {
    return 'last';
  }
  if (progress.durationSeconds > 0) {
    return 'duration';
  }
  return 'none';
};
