import { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { stopPropagation } from '../../lib/gesture/stopPropagation';
import { useTheme } from '../../theme/useTheme';
import { Button } from '../primitives';

/**
 * Presentational premium-gate dialog (Track 19.4). All copy is passed in **already localized** —
 * the component holds no strings — so the `MembershipGateProvider` owns the reason→copy mapping and
 * the auth-based confirm label ("Renew" for logged-in, "Sign Up" for logged-out). Centered RN `Modal`
 * dialog (parity with the app's existing `Modal` sheets, but centered rather than bottom-anchored).
 */
export type PremiumGateModalProps = {
  visible: boolean;
  title: string;
  body: string;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function PremiumGateModal({
  visible,
  title,
  body,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
}: PremiumGateModalProps) {
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
      <Pressable accessibilityLabel={cancelLabel} onPress={onCancel} style={styles.backdrop}>
        <Pressable onPress={stopPropagation} style={styles.dialog} testID="premium-gate-modal">
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          <View style={styles.actions}>
            <Button
              label={cancelLabel}
              onPress={onCancel}
              testID="premium-gate-cancel"
              variant="secondary"
            />
            <Button
              label={confirmLabel}
              onPress={onConfirm}
              testID="premium-gate-renew"
              variant="primary"
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
