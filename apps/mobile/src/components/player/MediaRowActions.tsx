import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { stopPropagation } from '../../lib/gesture/stopPropagation';
import { useTheme } from '../../theme/useTheme';
import type { ButtonSize, ButtonVariant } from '../primitives';
import { ActionSheet, Button } from '../primitives';

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
  /** Optional heading shown at the top of the action sheet. */
  sheetTitle?: string;
  size?: ButtonSize;
  /** Suffix appended to default testIDs (e.g. a row id) so sibling rows stay unique. */
  idSuffix?: string;
};

/** Minimal translate signature so the pure builder is unit-testable without i18next. */
export type MediaRowTranslate = (key: string) => string;

/**
 * Handlers for the standard web-parity intents. Only intents with a handler are emitted, so a call
 * site advertises exactly what mobile supports. Play stays inline (not in this list). Order mirrors
 * the web `ItemRowMoreActions` menu.
 */
export type MediaRowMoreActionHandlers = {
  onQueueNext?: () => void;
  onQueueLast?: () => void;
  onAddToPlaylist?: () => void;
  onMarkAsPlayed?: () => void;
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
  options?: { idSuffix?: string }
): MediaRowMoreAction[] => {
  const suffix = options?.idSuffix ?? '';
  return MORE_ACTION_SPECS.flatMap((spec) => {
    const onPress = handlers[spec.intent];
    if (onPress === undefined) {
      return [];
    }
    return [
      {
        key: spec.key,
        label: translate(spec.i18nKey),
        onPress,
        testID: `media-row-action-${spec.key}${suffix}`,
      },
    ];
  });
};

/**
 * Shared media-row action affordance mirroring web `PlayButtonRow` + `ItemRowMoreActions` intents:
 * an inline Play/Pause button plus an optional "More options" trigger opening the shared bottom
 * `ActionSheet` — a native menu rather than a port of the web hover menu. Per-action copy is
 * localized by the caller; the generic chrome uses i18n here.
 *
 * Presses stop propagation so the control works inside a row `Pressable` without also triggering
 * row navigation.
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
}: MediaRowActionsProps) {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const [isSheetVisible, setIsSheetVisible] = useState(false);

  const hasMoreActions = moreActions !== undefined && moreActions.length > 0;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          alignItems: 'center',
          flexDirection: 'row',
          gap: tokens.spacing.sm,
        },
      }),
    [tokens]
  );

  const closeSheet = () => {
    setIsSheetVisible(false);
  };

  return (
    <View style={styles.container}>
      <Button
        label={playLabel}
        onPress={(event) => {
          stopPropagation(event);
          onPlayPress();
        }}
        size={size}
        testID={playTestID ?? `media-row-play${idSuffix}`}
        variant={playVariant}
      />
      {hasMoreActions ? (
        <Button
          accessibilityLabel={t('media.more_options')}
          label={t('media.more_options')}
          onPress={(event) => {
            stopPropagation(event);
            setIsSheetVisible(true);
          }}
          size={size}
          testID={moreTestID ?? `media-row-more${idSuffix}`}
          variant="secondary"
        />
      ) : null}

      {hasMoreActions ? (
        <ActionSheet
          onRequestClose={closeSheet}
          sections={[
            {
              items: (moreActions ?? []).map((action) => ({
                disabled: action.disabled,
                key: action.key,
                label: action.label,
                onPress: action.onPress,
                testID: action.testID ?? `media-row-action-${action.key}${idSuffix}`,
              })),
              key: 'actions',
              title: sheetTitle,
            },
          ]}
          testID={`media-row-sheet${idSuffix}`}
          visible={isSheetVisible}
        />
      ) : null}
    </View>
  );
}
