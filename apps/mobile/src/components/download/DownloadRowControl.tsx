import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import type { DTOItem } from '@podverse/helpers/dto';

import { useActionError } from '../../feedback/ActionErrorProvider';
import { downloadActionLabelKey, runDownloadAction } from '../../downloads/downloadAction';
import type { DownloadStatus } from '../../downloads/downloadTypes';
import { useDownloadAction } from '../../downloads/useDownloads';
import { stopPropagation } from '../../lib/gesture/stopPropagation';
import { playbackTargetRowMediaId } from '../../lib/playback/buildPlaybackTarget';
import { usePlaybackSession } from '../../playback/PlaybackProvider';
import { LIST_ROW_ACTION_ICON_SIZE, LIST_ROW_ACTION_SIZE } from '../../theme/screenLayout';
import { useTheme } from '../../theme/useTheme';

type DownloadRowControlProps = {
  item: DTOItem;
  testID: string;
  /** When the file is on disk, Maestro waits on this id. List rows omit it so their id stays stable. */
  completeTestID?: string;
};

const statusIconName = (status: DownloadStatus | null): ComponentProps<typeof Ionicons>['name'] => {
  switch (status) {
    case 'complete':
      return 'trash-outline';
    case 'failed':
      return 'alert-circle-outline';
    case 'cancelled':
    case 'downloading':
    case 'queued':
    case 'paused':
    case null:
      return 'download-outline';
  }
};

/**
 * The download affordance as a list row carries it: one icon, one tap. **Renders nothing** when the
 * item cannot be downloaded — a livestream, an HLS-only source, or no enclosure — the same
 * eligibility the More menu uses.
 *
 * Hit target matches {@link LIST_ROW_ACTION_SIZE} (same as Play / More) so icon controls share one
 * finger target. The glyph itself is borderless and uses {@link LIST_ROW_ACTION_ICON_SIZE} — the
 * same optical size as More — so trash and download do not look smaller than the ellipsis.
 *
 * The busy state is a spinner with no percentage, and the row does not subscribe to byte progress.
 * A screen can show forty of these at once, and per-chunk work multiplied by forty rows is what
 * makes a list stutter while something downloads. My Library → Downloads is where a user goes for
 * the number.
 */
export function DownloadRowControl({
  completeTestID,
  item,
  testID,
}: DownloadRowControlProps) {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const { activeTarget, enclosureSelectedParams } = usePlaybackSession();
  const activeItemId = activeTarget !== null ? playbackTargetRowMediaId(activeTarget) : null;
  const explicitSelectedParams =
    activeItemId === item.id_text ? enclosureSelectedParams : undefined;
  const { isDownloadable, errorReason, remove, start, status } = useDownloadAction(item, false, {
    explicitSelectedParams,
  });
  const { openDownloadError } = useActionError();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        control: {
          alignItems: 'center',
          height: LIST_ROW_ACTION_SIZE,
          justifyContent: 'center',
          width: LIST_ROW_ACTION_SIZE,
        },
        pressed: {
          opacity: 0.7,
        },
      }),
    []
  );

  if (!isDownloadable) {
    return null;
  }

  const isInProgress = status === 'queued' || status === 'downloading' || status === 'paused';
  const iconColor = status === 'failed' ? tokens.text.danger : tokens.button.secondaryColor;

  return (
    <Pressable
      accessibilityLabel={
        status === 'failed' ? t('action_error.download_a11y') : t(downloadActionLabelKey(status))
      }
      accessibilityRole="button"
      accessibilityState={{ busy: isInProgress }}
      onPress={(event) => {
        stopPropagation(event);
        if (status === 'failed') {
          openDownloadError(errorReason, start);
          return;
        }
        runDownloadAction({ remove, start, status });
      }}
      style={({ pressed }) => [styles.control, pressed ? styles.pressed : null]}
      testID={
        status === 'complete' && completeTestID !== undefined ? completeTestID : testID
      }
    >
      {isInProgress ? (
        <ActivityIndicator color={tokens.text.secondary} size="small" />
      ) : (
        <Ionicons
          color={iconColor}
          name={statusIconName(status)}
          size={LIST_ROW_ACTION_ICON_SIZE}
        />
      )}
    </Pressable>
  );
}
