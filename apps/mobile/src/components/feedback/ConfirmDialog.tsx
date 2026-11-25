import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { stopPropagation } from '../../lib/gesture/stopPropagation';
import { formActionsTopGap } from '../../theme/screenLayout';
import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import type { FormAction } from '../form/FormActions';
import { FormActions } from '../form/FormActions';
import { AppOverlay, OverlayScrim } from '../overlay';
import type { ButtonVariant } from '../primitives/Button';

/**
 * Presentational dialog: title + body with a required dismiss action, an optional confirm action,
 * and an optional second confirm. The second confirm is shown only with a first confirm. Top to
 * bottom: confirm, second confirm, dismiss. `confirmOnly` keeps a single confirm and ignores the
 * scrim and the hardware back button.
 * All copy arrives already localized so each host owns wording and test IDs.
 */
export type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  body: string;
  cancelLabel: string;
  confirmLabel?: string;
  confirmVariant?: ButtonVariant;
  /** When true, the confirm action shows its loading state. */
  confirmLoading?: boolean;
  /** Single confirm. The scrim and hardware back do not dismiss. */
  confirmOnly?: boolean;
  /** Shown under the body when the confirm did not finish. */
  error?: string;
  /** When false, the scrim and hardware back do not dismiss. Ignored while `confirmOnly`. */
  requestCloseDismisses?: boolean;
  onCancel: () => void;
  onConfirm?: () => void;
  testID: string;
  cancelTestID: string;
  confirmTestID?: string;
  /** A second confirm between the first and cancel. Shown only with all three set and a first confirm. */
  secondaryConfirmLabel?: string;
  onSecondaryConfirm?: () => void;
  secondaryConfirmTestID?: string;
};

export function ConfirmDialog({
  visible,
  title,
  body,
  cancelLabel,
  confirmLabel,
  confirmVariant,
  confirmLoading,
  confirmOnly = false,
  error,
  requestCloseDismisses = true,
  onCancel,
  onConfirm,
  testID,
  cancelTestID,
  confirmTestID,
  secondaryConfirmLabel,
  onSecondaryConfirm,
  secondaryConfirmTestID,
}: ConfirmDialogProps) {
  const { styles: themeStyles, tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        actions: {
          marginTop: formActionsTopGap(tokens.spacing),
        },
        // Neutral dimming scrim (not a theme color); mirrors the standard platform dialog backdrop.
        backdrop: {
          alignItems: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          flex: 1,
          justifyContent: 'center',
          padding: tokens.spacing.xl,
        },
        body: {
          ...typography.prose,
          color: themeStyles.textSecondary.color,
        },
        error: {
          ...typography.prose,
          color: themeStyles.textSecondary.color,
          marginTop: tokens.spacing.md,
        },
        contents: {
          flex: 1,
        },
        dialog: {
          backgroundColor: themeStyles.screen.backgroundColor,
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.md,
          borderWidth: 1,
          maxWidth: 420,
          padding: tokens.spacing.xl,
          width: '100%',
        },
        title: {
          ...typography.heading,
          color: themeStyles.textPrimary.color,
          fontWeight: '700',
          marginBottom: tokens.spacing.md,
        },
      }),
    [themeStyles, tokens]
  );

  const cancelAction: FormAction = {
    label: cancelLabel,
    onPress: onCancel,
    testID: cancelTestID,
    variant: 'secondary',
  };
  const confirmAction: FormAction | undefined =
    confirmLabel !== undefined && confirmTestID !== undefined && onConfirm !== undefined
      ? {
          label: confirmLabel,
          onPress: onConfirm,
          testID: confirmTestID,
          ...(confirmLoading === true ? { loading: true } : {}),
          ...(confirmVariant === undefined ? {} : { variant: confirmVariant }),
        }
      : undefined;
  const secondaryConfirmAction: FormAction | undefined =
    confirmAction !== undefined &&
    secondaryConfirmLabel !== undefined &&
    secondaryConfirmTestID !== undefined &&
    onSecondaryConfirm !== undefined
      ? {
          label: secondaryConfirmLabel,
          onPress: onSecondaryConfirm,
          testID: secondaryConfirmTestID,
          variant: 'outline',
        }
      : undefined;
  const dismissesOnRequest = confirmOnly !== true && requestCloseDismisses;
  const actions: readonly FormAction[] = [
    confirmAction,
    secondaryConfirmAction,
    confirmOnly ? undefined : cancelAction,
  ].filter((action): action is FormAction => action !== undefined);

  return (
    <AppOverlay
      animation="fade"
      onRequestClose={dismissesOnRequest ? onCancel : () => undefined}
      visible={visible}
    >
      <OverlayScrim style={styles.contents}>
        {/* The scrim is a sighted-only shortcut for the cancel button, so it stays out of the
            accessibility tree; `accessibilityViewIsModal` keeps VoiceOver inside the dialog rather
            than letting it wander onto the screen behind. */}
        <Pressable
          accessible={false}
          onPress={dismissesOnRequest ? onCancel : undefined}
          style={styles.backdrop}
        >
          <Pressable
            accessibilityViewIsModal
            accessibilityRole="alert"
            onPress={stopPropagation}
            style={styles.dialog}
            testID={testID}
          >
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.body}>{body}</Text>
            {error !== undefined && error !== '' ? (
              <Text accessibilityLiveRegion="polite" style={styles.error}>
                {error}
              </Text>
            ) : null}
            <FormActions actions={actions} style={styles.actions} />
          </Pressable>
        </Pressable>
      </OverlayScrim>
    </AppOverlay>
  );
}
