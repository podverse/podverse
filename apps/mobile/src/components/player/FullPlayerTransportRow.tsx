import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { GestureResponderEvent } from 'react-native';
import { StyleSheet, View } from 'react-native';

import type { PlaybackTransportState } from '../../playback/playbackTransport';
import {
  FULL_PLAYER_TRANSPORT_ICON_SIZE,
  FULL_PLAYER_TRANSPORT_ROW_HEIGHT,
} from '../../screens/player/fullPlayerLayout';
import { useTheme } from '../../theme/useTheme';
import { Button } from '../primitives/Button';
import { FULL_PLAYER_JUMP_BACK_SECONDS, FULL_PLAYER_JUMP_FORWARD_SECONDS } from './fullPlayerRows';
import { PlayerJumpButton } from './PlayerJumpButton';
import { PlayerTransportButton } from './PlayerTransportButton';

type FullPlayerTransportRowProps = {
  /** When true, previous/next accept a hold that skips the episode (web chapter long-press). */
  hasEpisodeChaptersForTrackButtons: boolean;
  hasNextQueueItem: boolean;
  isMusicNowPlaying: boolean;
  isRepeatEnabled: boolean;
  isShuffleEnabled: boolean;
  onJumpBack: () => void;
  onJumpForward: () => void;
  onPause: (event: GestureResponderEvent) => void;
  onPlay: (event: GestureResponderEvent) => void;
  onErrorPress: (event: GestureResponderEvent) => void;
  onSkipToNext: () => void;
  onSkipToNextTrack: () => void;
  onSkipToPrevious: () => void;
  onSkipToPreviousTrack: () => void;
  onToggleRepeat: () => void;
  onToggleShuffle: () => void;
  state: PlaybackTransportState;
};

/**
 * Five transport controls in equal-width slots, so the play circle sits on the screen's centerline
 * regardless of how wide the controls beside it are.
 */
export function FullPlayerTransportRow({
  hasEpisodeChaptersForTrackButtons,
  hasNextQueueItem,
  isMusicNowPlaying,
  isRepeatEnabled,
  isShuffleEnabled,
  onJumpBack,
  onJumpForward,
  onPause,
  onPlay,
  onErrorPress,
  onSkipToNext,
  onSkipToNextTrack,
  onSkipToPrevious,
  onSkipToPreviousTrack,
  onToggleRepeat,
  onToggleShuffle,
  state,
}: FullPlayerTransportRowProps) {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const iconColor = tokens.button.secondaryColor;

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

  const previousLabel = hasEpisodeChaptersForTrackButtons
    ? t('media_player.skip_to_previous_hold_hint')
    : t('media_player.skip_to_previous');
  const nextLabel = hasEpisodeChaptersForTrackButtons
    ? t('media_player.skip_to_next_hold_hint')
    : t('media_player.skip_to_next');
  // Chapters keep next enabled (tap may no-op on the last chapter; hold still skips the episode).
  const nextDisabled = !hasEpisodeChaptersForTrackButtons && !hasNextQueueItem;

  return (
    <View style={styles.row} testID="full-player-transport-row">
      <View style={styles.slot}>
        <Button
          accessibilityLabel={previousLabel}
          icon={
            <Ionicons
              color={iconColor}
              name="play-skip-back"
              size={FULL_PLAYER_TRANSPORT_ICON_SIZE}
            />
          }
          iconOnly
          label={previousLabel}
          onLongPress={
            hasEpisodeChaptersForTrackButtons
              ? () => {
                  void onSkipToPreviousTrack();
                }
              : undefined
          }
          onPress={() => {
            void onSkipToPrevious();
          }}
          size="lg"
          testID="full-player-skip-previous"
          variant="ghost"
        />
      </View>
      <View style={styles.slot}>
        {isMusicNowPlaying ? (
          <Button
            accessibilityLabel={t('media_player.shuffle.toggle_shuffle')}
            icon={
              <Ionicons
                color={iconColor}
                name={isShuffleEnabled ? 'shuffle' : 'shuffle-outline'}
                size={FULL_PLAYER_TRANSPORT_ICON_SIZE}
              />
            }
            iconOnly
            label={t('media_player.shuffle.toggle_shuffle')}
            onPress={onToggleShuffle}
            size="lg"
            testID="full-player-shuffle"
            variant={isShuffleEnabled ? 'secondary' : 'ghost'}
          />
        ) : (
          <PlayerJumpButton
            direction="back"
            onPress={onJumpBack}
            seconds={FULL_PLAYER_JUMP_BACK_SECONDS}
            showSeconds={false}
            testID="full-player-jump-back"
          />
        )}
      </View>
      <View style={styles.slot}>
        <PlayerTransportButton
          onPause={onPause}
          onPlay={onPlay}
          onErrorPress={onErrorPress}
          size="xl"
          state={state}
          testID="full-player-play-pause"
        />
      </View>
      <View style={styles.slot}>
        {isMusicNowPlaying ? (
          <Button
            accessibilityLabel={t('media_player.repeat.toggle_repeat')}
            icon={
              <Ionicons
                color={iconColor}
                name={isRepeatEnabled ? 'repeat' : 'repeat-outline'}
                size={FULL_PLAYER_TRANSPORT_ICON_SIZE}
              />
            }
            iconOnly
            label={t('media_player.repeat.toggle_repeat')}
            onPress={onToggleRepeat}
            size="lg"
            testID="full-player-repeat"
            variant={isRepeatEnabled ? 'secondary' : 'ghost'}
          />
        ) : (
          <PlayerJumpButton
            direction="forward"
            onPress={onJumpForward}
            seconds={FULL_PLAYER_JUMP_FORWARD_SECONDS}
            showSeconds={false}
            testID="full-player-jump-forward"
          />
        )}
      </View>
      <View style={styles.slot}>
        <Button
          accessibilityLabel={nextLabel}
          disabled={nextDisabled}
          icon={
            <Ionicons
              color={iconColor}
              name="play-skip-forward"
              size={FULL_PLAYER_TRANSPORT_ICON_SIZE}
            />
          }
          iconOnly
          label={nextLabel}
          onLongPress={
            hasEpisodeChaptersForTrackButtons
              ? () => {
                  void onSkipToNextTrack();
                }
              : undefined
          }
          onPress={() => {
            void onSkipToNext();
          }}
          size="lg"
          testID="full-player-skip-next"
          variant="ghost"
        />
      </View>
    </View>
  );
}
