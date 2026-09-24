import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { stopPropagation } from '../../lib/gesture/stopPropagation';
import { useTheme } from '../../theme/useTheme';
import { FormActions } from '../form/FormActions';
import type { FormAction } from '../form/FormActions';
import { AppOverlay, OverlayScrim } from '../overlay';

/**
 * Presentational dialog: title + body with a required dismiss action and an optional confirm action.
 * All copy arrives already localized so each host owns wording and test IDs.
 */
export type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  body: string;
  cancelLabel: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm?: () => void;
  testID: string;
  cancelTestID: string;
  confirmTestID?: string;
};

export function ConfirmDialog({
  visible,
  title,
  body,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
  testID,
  cancelTestID,
  confirmTestID,
}: ConfirmDialogProps) {
  const { styles: themeStyles, tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        // Neutral dimming scrim (not a theme color); mirrors the standard platform dialog backdrop.
        backdrop: {
          alignItems: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          flex: 1,
          justifyContent: 'center',
          padding: tokens.spacing.xl,
        },
        body: {
          color: themeStyles.textSecondary.color,
          fontSize: 15,
        },
        contents: {
          flex: 1,
        },
        dialog: {
          backgroundColor: themeStyles.screen.backgroundColor,
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.md,
          borderWidth: 1,
          gap: tokens.spacing.md,
          maxWidth: 420,
          padding: tokens.spacing.xl,
          width: '100%',
        },
        title: {
          color: themeStyles.textPrimary.color,
          fontSize: 18,
          fontWeight: '700',
        },
      }),
    [themeStyles, tokens]
  );

  const actions: readonly FormAction[] =
    confirmLabel !== undefined && confirmTestID !== undefined && onConfirm !== undefined
      ? [
          {
            label: cancelLabel,
            onPress: onCancel,
            testID: cancelTestID,
            variant: 'secondary',
          },
          {
            label: confirmLabel,
            onPress: onConfirm,
            testID: confirmTestID,
          },
        ]
      : [
          {
            label: cancelLabel,
            onPress: onCancel,
            testID: cancelTestID,
            variant: 'secondary',
          },
        ];

  return (
    <AppOverlay animation="fade" onRequestClose={onCancel} visible={visible}>
      <OverlayScrim style={styles.contents}>
        {/* The scrim is a sighted-only shortcut for the cancel button, so it stays out of the
            accessibility tree; `accessibilityViewIsModal` keeps VoiceOver inside the dialog rather
            than letting it wander onto the screen behind. */}
        <Pressable accessible={false} onPress={onCancel} style={styles.backdrop}>
          <Pressable
            accessibilityViewIsModal
            accessibilityRole="alert"
            onPress={stopPropagation}
            style={styles.dialog}
            testID={testID}
          >
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.body}>{body}</Text>
            <FormActions actions={actions} />
          </Pressable>
        </Pressable>
      </OverlayScrim>
    </AppOverlay>
  );
}
