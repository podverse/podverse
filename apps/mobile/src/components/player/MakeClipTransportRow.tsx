import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  MEDIA_JUMP_BACK_SECONDS,
  MEDIA_JUMP_FORWARD_SECONDS,
  MEDIA_MINI_JUMP_SECONDS,
} from '@podverse/helpers';

import type { PlaybackTransportState } from '../../playback/playbackTransport';
import { FULL_PLAYER_TRANSPORT_ROW_HEIGHT } from '../../screens/player/fullPlayerLayout';
import { PlayerTransportButton } from './PlayerTransportButton';
import { PlayerJumpButton } from './PlayerJumpButton';

type MakeClipTransportRowProps = {
  onJumpBack: () => void;
  onJumpBackSmall: () => void;
  onJumpForward: () => void;
  onJumpForwardSmall: () => void;
  onPause: () => void;
  onPlay: () => void;
  onRetry: () => void;
  state: PlaybackTransportState;
};

export function MakeClipTransportRow({
  onJumpBack,
  onJumpBackSmall,
  onJumpForward,
  onJumpForwardSmall,
  onPause,
  onPlay,
  onRetry,
  state,
}: MakeClipTransportRowProps) {
  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          alignItems: 'center',
          flexDirection: 'row',
          height: FULL_PLAYER_TRANSPORT_ROW_HEIGHT,
          width: '100%',
        },
        slot: {
          alignItems: 'center',
          flex: 1,
          flexDirection: 'row',
          justifyContent: 'center',
        },
      }),
    []
  );

  return (
    <View style={styles.row} testID="make-clip-transport-row">
      <View style={styles.slot}>
        <PlayerJumpButton
          direction="back"
          onPress={onJumpBack}
          seconds={MEDIA_JUMP_BACK_SECONDS}
          testID="make-clip-jump-back-10"
        />
      </View>
      <View style={styles.slot}>
        <PlayerJumpButton
          direction="back"
          onPress={onJumpBackSmall}
          seconds={MEDIA_MINI_JUMP_SECONDS}
          testID="make-clip-jump-back-1"
        />
      </View>
      <View style={styles.slot}>
        <PlayerTransportButton
          onPause={() => {
            onPause();
          }}
          onPlay={() => {
            onPlay();
          }}
          onRetry={() => {
            onRetry();
          }}
          size="xl"
          state={state}
          testID="make-clip-play-pause"
        />
      </View>
      <View style={styles.slot}>
        <PlayerJumpButton
          direction="forward"
          onPress={onJumpForwardSmall}
          seconds={MEDIA_MINI_JUMP_SECONDS}
          testID="make-clip-jump-forward-1"
        />
      </View>
      <View style={styles.slot}>
        <PlayerJumpButton
          direction="forward"
          onPress={onJumpForward}
          seconds={MEDIA_JUMP_FORWARD_SECONDS}
          testID="make-clip-jump-forward-30"
        />
      </View>
    </View>
  );
}
