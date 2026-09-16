import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import type { GestureResponderEvent } from 'react-native';

import type { PlaybackTransportState } from '../../playback/playbackTransport';
import { LIST_ROW_ACTION_ICON_SIZE, LIST_ROW_PLAY_ICON_SIZE } from '../../theme/screenLayout';
import { useTheme } from '../../theme/useTheme';
import type { ButtonSize } from '../primitives/Button';
import { Button } from '../primitives/Button';

type PlayerTransportButtonProps = {
  /**
   * `ring` is the bordered play circle list rows and detail chrome use. `bare` drops the border and
   * fill for a chrome bar that is already its own surface.
   */
  appearance?: 'bare' | 'ring';
  onPause: (event: GestureResponderEvent) => void;
  onPlay: (event: GestureResponderEvent) => void;
  onRetry: (event: GestureResponderEvent) => void;
  size?: ButtonSize;
  state: PlaybackTransportState;
  testID: string;
};

/** Play mark inside the full player's `xl` circle, and inside the `lg` circle a step below it. */
const PLAYER_CIRCLE_ICON_SIZE = 30;
const LARGE_CIRCLE_ICON_SIZE = 22;

const iconName = (
  state: PlaybackTransportState
): ComponentProps<typeof Ionicons>['name'] | null => {
  switch (state) {
    case 'error':
      return 'alert-circle';
    case 'loading':
      return null;
    case 'paused':
      return 'play';
    case 'playing':
      return 'pause';
  }
};

/**
 * Play / pause / loading / retry control for the mini player and full player only.
 *
 * Carries the accent glyph the list-row and detail play buttons use; `appearance` decides whether it
 * also wears their ring. List rows and detail screens use `MediaRowActions` play/pause and must not
 * mount this — a spinner or error icon on every row would fight the player chrome that already owns
 * that state.
 */
export function PlayerTransportButton({
  appearance = 'ring',
  onPause,
  onPlay,
  onRetry,
  size = 'sm',
  state,
  testID,
}: PlayerTransportButtonProps) {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const iconColor = state === 'error' ? tokens.text.danger : tokens.button.secondaryColor;

  const label =
    state === 'error'
      ? t('misc.try_again')
      : state === 'loading'
        ? t('misc.loading')
        : state === 'playing'
          ? t('media_player.pause')
          : t('media_player.play');

  const glyph = iconName(state);
  // A bare glyph carries the control on its own, so it takes the larger size bare row icons use;
  // inside the ring the play mark stays compact.
  const iconSize =
    size === 'xl'
      ? PLAYER_CIRCLE_ICON_SIZE
      : size === 'lg'
        ? LARGE_CIRCLE_ICON_SIZE
        : appearance === 'bare'
          ? LIST_ROW_ACTION_ICON_SIZE
          : LIST_ROW_PLAY_ICON_SIZE;

  const handlePress = (event: GestureResponderEvent) => {
    if (state === 'error') {
      onRetry(event);
      return;
    }
    if (state === 'playing') {
      onPause(event);
      return;
    }
    if (state === 'paused') {
      onPlay(event);
    }
  };

  return (
    <Button
      accessibilityLabel={label}
      icon={
        glyph !== null ? <Ionicons color={iconColor} name={glyph} size={iconSize} /> : undefined
      }
      iconOnly
      label={label}
      loading={state === 'loading'}
      onPress={handlePress}
      size={size}
      testID={testID}
      variant={appearance === 'bare' ? 'ghost' : 'play'}
    />
  );
}
