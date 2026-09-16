import { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { clampRatio } from '@podverse/helpers/math';

import { usePlaybackProgress } from '../../playback/PlaybackProvider';
import { MINI_PLAYER_PROGRESS_EDGE_HEIGHT } from '../../theme/screenLayout';
import { ProgressTrack } from '../primitives/ProgressTrack';

/** Mini-player top edge fill. Isolated so the mini player shell stays off the playhead tick path. */
export function MiniPlayerProgress() {
  const { durationSeconds, positionSeconds } = usePlaybackProgress();
  const progressRatio = durationSeconds > 0 ? clampRatio(positionSeconds / durationSeconds) : 0;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        track: {
          height: MINI_PLAYER_PROGRESS_EDGE_HEIGHT,
        },
      }),
    []
  );

  return (
    <ProgressTrack
      fillTestID="mini-player-progress"
      flush
      height={MINI_PLAYER_PROGRESS_EDGE_HEIGHT}
      ratio={progressRatio}
      style={styles.track}
    />
  );
}
