import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { stopPropagation } from '../../lib/gesture/stopPropagation';
import { useTheme } from '../../theme/useTheme';
import type { ButtonSize, ButtonVariant } from '../primitives';
import { Button } from '../primitives';

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
 * site advertises exactly what mobile can do today (Track 9c.1 inventory). Play stays inline (not in
 * this list). Order mirrors the web `ItemRowMoreActions` menu.
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
 * `features.*` i18n keys (fixing the Track 9c.1 mislabel where a single Queue button carried
 * `queue_next` copy but appended to the end). Kept side-effect free for unit tests: pass a translate
 * fn and the handlers you support; only those are returned, in web-menu order.
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
 * Shared media-row action affordance (Track 9c.2) mirroring web `PlayButtonRow` + `ItemRowMoreActions`
 * intents: an inline Play/Pause button plus an optional "More options" trigger that opens a native
 * bottom action sheet (RN `Modal`) — not a web hover-menu port. All copy is localized by the caller
 * (per-action labels) or via i18n for the generic chrome. Presses stop propagation so the control
 * works inside a row `Pressable` without triggering row navigation. Consumed by ≥2 call sites in
 * Track 9c.3 (Home / detail lists) so queue-next vs queue-last become distinct, correctly-keyed
 * actions.
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
  const { styles: themeStyles, tokens } = useTheme();
  const [isSheetVisible, setIsSheetVisible] = useState(false);

  const hasMoreActions = moreActions !== undefined && moreActions.length > 0;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        actionRow: {
          borderTopColor: themeStyles.border.borderColor,
          borderTopWidth: 1,
          paddingHorizontal: tokens.spacing.lg,
          paddingVertical: tokens.spacing.md,
        },
        actionRowDisabled: {
          opacity: 0.5,
        },
        actionRowLabel: {
          color: themeStyles.textPrimary.color,
          fontSize: 16,
        },
        // Neutral dimming scrim (not a theme color); mirrors the standard RN modal backdrop.
        backdrop: {
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          flex: 1,
          justifyContent: 'flex-end',
        },
        container: {
          alignItems: 'center',
          flexDirection: 'row',
          gap: tokens.spacing.sm,
        },
        sheet: {
          backgroundColor: themeStyles.screen.backgroundColor,
          borderTopLeftRadius: tokens.radii.md,
          borderTopRightRadius: tokens.radii.md,
          paddingBottom: tokens.spacing['2xl'],
          paddingTop: tokens.spacing.sm,
        },
        sheetTitle: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          fontWeight: '600',
          paddingHorizontal: tokens.spacing.lg,
          paddingVertical: tokens.spacing.md,
        },
      }),
    [themeStyles, tokens]
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
        <Modal
          animationType="slide"
          onRequestClose={closeSheet}
          transparent
          visible={isSheetVisible}
        >
          <Pressable
            accessibilityLabel={t('misc.close')}
            onPress={closeSheet}
            style={styles.backdrop}
            testID={`media-row-sheet-backdrop${idSuffix}`}
          >
            <Pressable
              onPress={stopPropagation}
              style={styles.sheet}
              testID={`media-row-sheet${idSuffix}`}
            >
              {sheetTitle !== undefined ? (
                <Text style={styles.sheetTitle}>{sheetTitle}</Text>
              ) : null}
              {moreActions?.map((action) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: action.disabled ?? false }}
                  disabled={action.disabled ?? false}
                  key={action.key}
                  onPress={() => {
                    closeSheet();
                    action.onPress();
                  }}
                  style={[
                    styles.actionRow,
                    action.disabled === true ? styles.actionRowDisabled : null,
                  ]}
                  testID={action.testID ?? `media-row-action-${action.key}${idSuffix}`}
                >
                  <Text style={styles.actionRowLabel}>{action.label}</Text>
                </Pressable>
              ))}
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}
