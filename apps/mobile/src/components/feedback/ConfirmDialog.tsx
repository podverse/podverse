import { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { stopPropagation } from '../../lib/gesture/stopPropagation';
import { useTheme } from '../../theme/useTheme';
import { Button } from '../primitives';

/**
 * Presentational two-action dialog: a title, a body, and a dismiss/confirm pair. All copy arrives
 * **already localized** — the component holds no strings — so each host owns its own wording and
 * its own test IDs. Centered RN `Modal` (parity with the app's other sheets, but centered rather
 * than bottom-anchored).
 */
export type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  body: string;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  testID: string;
  cancelTestID: string;
  confirmTestID: string;
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
        actions: {
          flexDirection: 'row',
          gap: tokens.spacing.md,
          justifyContent: 'flex-end',
          marginTop: tokens.spacing.sm,
        },
        // Neutral dimming scrim (not a theme color); mirrors the standard RN modal backdrop.
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

  return (
    <Modal animationType="fade" onRequestClose={onCancel} transparent visible={visible}>
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
          <View style={styles.actions}>
            <Button
              label={cancelLabel}
              onPress={onCancel}
              testID={cancelTestID}
              variant="secondary"
            />
            <Button
              label={confirmLabel}
              onPress={onConfirm}
              testID={confirmTestID}
              variant="primary"
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
