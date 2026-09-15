import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import { clampRatio } from '@podverse/helpers/math';

import { stopPropagation } from '../../lib/gesture/stopPropagation';
import {
  normalizeHomeFeedPlaybackMediaId,
  playbackTargetRowMediaId,
} from '../../lib/playback/buildPlaybackTarget';
import { usePlaybackProgress, usePlaybackSession } from '../../playback/PlaybackProvider';
import { LIST_ROW_ACTION_ICON_SIZE, LIST_ROW_PLAY_ICON_SIZE } from '../../theme/screenLayout';
import { useTheme } from '../../theme/useTheme';
import type { ButtonSize, ButtonVariant } from '../primitives';
import { Button, MoreMenu, ProgressTrack } from '../primitives';

/**
 * One "more" menu entry. `label` is passed **already localized** by the caller (or produced by
 * `buildMediaRowMoreActions`) so this component never hardcodes English per-action copy. `key` is a
 * stable identifier used for React keys and the default testID suffix.
 */
export type MediaRowMoreAction = {
  key: string;
  label: string;
  onPress: () => void;
  testID?: string;
  disabled?: boolean;
  /** Danger rows (Delete) use the danger text token. */
  tone?: 'danger';
};

export type MediaRowActionsProps = {
  /** Localized Play/Pause label (caller owns play↔pause copy). */
  playLabel: string;
  onPlayPress: () => void;
  playTestID?: string;
  playVariant?: ButtonVariant;
  /** More-menu entries. When empty/undefined the More trigger is not rendered. */
  moreActions?: MediaRowMoreAction[];
  moreTestID?: string;
  /** Optional heading shown at the top of the more menu. */
  sheetTitle?: string;
  size?: ButtonSize;
  /** Suffix appended to default testIDs (e.g. a row id) so sibling rows stay unique. */
  idSuffix?: string;
  /**
   * `icons` draws Play and More as icon-only controls with duration beside Play and More pushed to
   * the trailing edge. `labels` keeps the labeled pills in a tight cluster.
   */
  appearance?: 'icons' | 'labels';
  /** Already-formatted duration shown beside Play when `appearance` is `icons`. */
  durationLabel?: string | null;
  durationTestID?: string;
  /**
   * When set (icons appearance), match against the active playback target so this row can show
   * pause + an in-row progress track. Prefer a content `id_text` (or a home-feed prefixed id).
   */
  playbackMediaId?: string | null;
  /**
   * When false, an active row still switches Play to Pause but does not mount the in-row track.
   * The track is also omitted when there is no duration to display; More still sits on the trailing
   * edge.
   */
  showActiveProgress?: boolean;
};

/** Minimal translate signature so the pure builder is unit-testable without i18next. */
export type MediaRowTranslate = (key: string) => string;

/**
 * Handlers for the standard web-parity intents. Only intents with a handler are emitted, so a call
 * site advertises exactly what mobile supports. Order mirrors the web `ItemRowMoreActions` menu,
 * then Download or Delete last. Download sits in this list even when the row also has a one-tap
 * download icon.
 */
export type MediaRowMoreActionHandlers = {
  onQueueNext?: () => void;
  onQueueLast?: () => void;
  onAddToPlaylist?: () => void;
  onMarkAsPlayed?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
};

const MORE_ACTION_SPECS: {
  intent: keyof MediaRowMoreActionHandlers;
  key: string;
  i18nKey: string;
}[] = [
  { i18nKey: 'features.queue.queue_next', intent: 'onQueueNext', key: 'queue-next' },
  { i18nKey: 'features.queue.queue_last', intent: 'onQueueLast', key: 'queue-last' },
  {
    i18nKey: 'features.playlist.add_to_playlist',
    intent: 'onAddToPlaylist',
    key: 'add-to-playlist',
  },
  { i18nKey: 'features.history.mark_as_played', intent: 'onMarkAsPlayed', key: 'mark-as-played' },
  { i18nKey: 'features.share', intent: 'onShare', key: 'share' },
  { i18nKey: 'features.download.download_episode', intent: 'onDownload', key: 'download' },
];

/**
 * Pure builder that maps intent handlers to localized `MediaRowMoreAction`s with the **correct**
 * `features.*` i18n keys, with separate queue-next and queue-last actions. Kept side-effect free for
 * unit tests: pass a translate fn and the handlers you support; only those are returned, in web-menu
 * order.
 */
export const buildMediaRowMoreActions = (
  translate: MediaRowTranslate,
  handlers: MediaRowMoreActionHandlers,
  options?: { downloadLabelKey?: string; downloadTone?: 'danger'; idSuffix?: string }
): MediaRowMoreAction[] => {
  const suffix = options?.idSuffix ?? '';
  return MORE_ACTION_SPECS.flatMap((spec) => {
    const onPress = handlers[spec.intent];
    if (onPress === undefined) {
      return [];
    }
    const i18nKey =
      spec.intent === 'onDownload' && options?.downloadLabelKey !== undefined
        ? options.downloadLabelKey
        : spec.i18nKey;
    return [
      {
        key: spec.key,
        label: translate(i18nKey),
        onPress,
        testID: `media-row-action-${spec.key}${suffix}`,
        tone: spec.intent === 'onDownload' ? options?.downloadTone : undefined,
      },
    ];
  });
};

/**
 * Playhead fill for the active list row only. Subscribes to progress ticks in isolation so sibling
 * rows that only watch the session context do not re-render on every timeupdate.
 */
function MediaRowActiveProgress({ testID }: { testID?: string }) {
  const { durationSeconds, positionSeconds } = usePlaybackProgress();
  const ratio = durationSeconds > 0 ? clampRatio(positionSeconds / durationSeconds) : 0;

  return (
    <ProgressTrack
      fillTestID={testID !== undefined ? `${testID}-fill` : undefined}
      height={3}
      ratio={ratio}
      style={mediaRowProgressTrackStyle}
    />
  );
}

const mediaRowProgressTrackStyle = { flex: 1, minWidth: 32 };

/**
 * Shared media-row action affordance mirroring web `PlayButtonRow` + `ItemRowMoreActions` intents:
 * an inline Play/Pause control plus an optional "More options" trigger opening `MoreMenu`.
 * Per-action copy is localized by the caller; the generic chrome uses i18n here.
 *
 * Presses stop propagation so the control works inside a row `Pressable` without also triggering
 * row navigation.
 *
 * When `playbackMediaId` is set, session match drives pause chrome and mounts an isolated progress
 * track for the active row only (ticks do not re-render sibling rows).
 */
export function MediaRowActions({
  playLabel,
  onPlayPress,
  playTestID,
  playVariant = 'secondary',
  moreActions,
  moreTestID,
  sheetTitle,
  size = 'sm',
  idSuffix = '',
  appearance = 'labels',
  durationLabel = null,
  durationTestID,
  playbackMediaId = null,
  showActiveProgress = true,
}: MediaRowActionsProps) {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const [isSheetVisible, setIsSheetVisible] = useState(false);
  const useIcons = appearance === 'icons';
  const hasDuration = durationLabel !== null && durationLabel.length > 0;
  // Icon rows follow legacy: Play is the glowing ring; More is a bare ellipsis (no outline).
  const playButtonVariant: ButtonVariant = useIcons ? 'play' : playVariant;
  const moreButtonVariant: ButtonVariant = useIcons ? 'ghost' : playVariant;

  const hasMoreActions = moreActions !== undefined && moreActions.length > 0;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          alignItems: 'center',
          flexDirection: 'row',
          gap: tokens.spacing.sm,
          ...(useIcons ? { flex: 1, justifyContent: 'space-between' } : null),
        },
        duration: {
          color: tokens.text.accent,
          fontSize: 14,
          fontWeight: '400',
          lineHeight: 18,
        },
        leading: {
          alignItems: 'center',
          flex: useIcons ? 1 : undefined,
          flexDirection: 'row',
          gap: tokens.spacing.base,
          minWidth: 0,
        },
      }),
    [tokens, useIcons]
  );

  const closeSheet = () => {
    setIsSheetVisible(false);
  };

  const moreIconColor = tokens.button.secondaryColor;

  const moreButton = hasMoreActions ? (
    <Button
      accessibilityLabel={t('media.more_options')}
      icon={
        useIcons ? (
          <Ionicons
            color={moreIconColor}
            name="ellipsis-horizontal"
            size={LIST_ROW_ACTION_ICON_SIZE}
          />
        ) : undefined
      }
      iconOnly={useIcons}
      label={t('media.more_options')}
      onPress={(event) => {
        stopPropagation(event);
        setIsSheetVisible(true);
      }}
      size={size}
      testID={moreTestID ?? `media-row-more${idSuffix}`}
      variant={moreButtonVariant}
    />
  ) : null;

  return (
    <View style={styles.container}>
      {useIcons ? (
        playbackMediaId !== null && playbackMediaId.length > 0 ? (
          <MediaRowIconsLeading
            durationLabel={durationLabel}
            durationStyle={styles.duration}
            durationTestID={durationTestID}
            hasDuration={hasDuration}
            idSuffix={idSuffix}
            leadingStyle={styles.leading}
            onPlayPress={onPlayPress}
            playLabel={playLabel}
            playTestID={playTestID}
            playVariant={playButtonVariant}
            playbackMediaId={playbackMediaId}
            showActiveProgress={showActiveProgress}
            size={size}
          />
        ) : (
          <View style={styles.leading}>
            <MediaRowPlayButton
              idSuffix={idSuffix}
              onPlayPress={onPlayPress}
              playLabel={playLabel}
              playTestID={playTestID}
              playVariant={playButtonVariant}
              showPauseIcon={false}
              size={size}
              useIcons={useIcons}
            />
            {hasDuration ? (
              <Text style={styles.duration} testID={durationTestID}>
                {durationLabel}
              </Text>
            ) : null}
          </View>
        )
      ) : (
        <MediaRowPlayButton
          idSuffix={idSuffix}
          onPlayPress={onPlayPress}
          playLabel={playLabel}
          playTestID={playTestID}
          playVariant={playButtonVariant}
          showPauseIcon={false}
          size={size}
          useIcons={false}
        />
      )}
      {moreButton}

      {hasMoreActions ? (
        <MoreMenu
          cancelLabel={t('misc.cancel')}
          onCancel={closeSheet}
          sections={[
            {
              items: (moreActions ?? []).map((action) => ({
                disabled: action.disabled,
                key: action.key,
                label: action.label,
                onPress: action.onPress,
                testID: action.testID ?? `media-row-action-${action.key}${idSuffix}`,
                tone: action.tone,
              })),
              key: 'actions',
              title: sheetTitle,
            },
          ]}
          testID={`media-row-menu${idSuffix}`}
          visible={isSheetVisible}
        />
      ) : null}
    </View>
  );
}

type MediaRowPlayButtonProps = {
  playLabel: string;
  onPlayPress: () => void;
  playTestID?: string;
  playVariant: ButtonVariant;
  size: ButtonSize;
  idSuffix: string;
  useIcons: boolean;
  showPauseIcon: boolean;
};

function MediaRowPlayButton({
  playLabel,
  onPlayPress,
  playTestID,
  playVariant,
  size,
  idSuffix,
  useIcons,
  showPauseIcon,
}: MediaRowPlayButtonProps) {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const playIconColor = useIcons ? tokens.button.secondaryColor : tokens.text.accent;
  const resolvedPlayLabel = showPauseIcon ? t('media_player.pause') : playLabel;

  return (
    <Button
      accessibilityLabel={resolvedPlayLabel}
      icon={
        useIcons ? (
          <Ionicons
            color={playIconColor}
            name={showPauseIcon ? 'pause' : 'play'}
            size={LIST_ROW_PLAY_ICON_SIZE}
          />
        ) : undefined
      }
      iconOnly={useIcons}
      label={resolvedPlayLabel}
      onPress={(event) => {
        stopPropagation(event);
        onPlayPress();
      }}
      size={size}
      testID={playTestID ?? `media-row-play${idSuffix}`}
      variant={playVariant}
    />
  );
}

type MediaRowIconsLeadingProps = {
  playbackMediaId: string;
  playLabel: string;
  onPlayPress: () => void;
  playTestID?: string;
  playVariant: ButtonVariant;
  size: ButtonSize;
  idSuffix: string;
  hasDuration: boolean;
  durationLabel: string | null;
  durationTestID?: string;
  leadingStyle: StyleProp<ViewStyle>;
  durationStyle: StyleProp<TextStyle>;
  showActiveProgress: boolean;
};

/**
 * Session subscriber for icon rows that can become now-playing. Progress ticks stay in
 * `MediaRowActiveProgress` so only the active row's bar re-renders on timeupdate.
 */
function MediaRowIconsLeading({
  playbackMediaId,
  playLabel,
  onPlayPress,
  playTestID,
  playVariant,
  size,
  idSuffix,
  hasDuration,
  durationLabel,
  durationTestID,
  leadingStyle,
  durationStyle,
  showActiveProgress,
}: MediaRowIconsLeadingProps) {
  const { activeTarget, isPlaying } = usePlaybackSession();
  const resolvedPlaybackMediaId = normalizeHomeFeedPlaybackMediaId(playbackMediaId);
  const activeMediaId = activeTarget !== null ? playbackTargetRowMediaId(activeTarget) : null;
  const isActiveRow = activeMediaId !== null && activeMediaId === resolvedPlaybackMediaId;
  const showPauseIcon = isActiveRow && isPlaying;

  return (
    <View style={leadingStyle}>
      <MediaRowPlayButton
        idSuffix={idSuffix}
        onPlayPress={onPlayPress}
        playLabel={playLabel}
        playTestID={playTestID}
        playVariant={playVariant}
        showPauseIcon={showPauseIcon}
        size={size}
        useIcons
      />
      {isActiveRow && showActiveProgress && hasDuration ? (
        <MediaRowActiveProgress
          testID={durationTestID !== undefined ? `${durationTestID}-progress` : undefined}
        />
      ) : null}
      {hasDuration ? (
        <Text style={durationStyle} testID={durationTestID}>
          {durationLabel}
        </Text>
      ) : null}
    </View>
  );
}
