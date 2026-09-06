import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import type { FeatureAccess } from '@podverse/helpers';

import {
  membershipGateConfirmDestination,
  membershipGateMessageKeys,
  membershipGateNoticeActionKey,
} from '../../membership/membershipGateCopy';
import { useTheme } from '../../theme/useTheme';
import { Button } from '../primitives';

/**
 * Inline card for a gate that has no single action to attach to. Prefer
 * `useMembershipGate().openGate(reason)` when the user taps a gated control — that opens
 * `ConfirmDialog` (Login for `needs_account`, Membership for the rest).
 *
 * Renders nothing when access is allowed. The reason→copy mapping matches the gate modal.
 */
export type GatedFeatureNoticeProps = {
  access: FeatureAccess;
  onRequestLogin: () => void;
  onRequestMembership: () => void;
  testID?: string;
};

export function GatedFeatureNotice({
  access,
  onRequestLogin,
  onRequestMembership,
  testID,
}: GatedFeatureNoticeProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        body: {
          color: themeStyles.textSecondary.color,
          fontSize: 14,
        },
        container: {
          backgroundColor: tokens.background.secondary,
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.md,
          borderWidth: 1,
          gap: tokens.spacing.md,
          padding: tokens.spacing.lg,
        },
        copy: {
          gap: tokens.spacing.xs,
        },
        title: {
          color: themeStyles.textPrimary.color,
          fontSize: 16,
          fontWeight: '700',
        },
      }),
    [themeStyles, tokens]
  );

  if (access.allowed) {
    return null;
  }

  const { reason } = access;
  const messageKeys = membershipGateMessageKeys(reason);
  const actionLabel = t(membershipGateNoticeActionKey(reason));
  const onPress =
    membershipGateConfirmDestination(reason) === 'login' ? onRequestLogin : onRequestMembership;

  return (
    <View style={styles.container} testID={testID}>
      {/* Not `accessible` as a group: that collapses the button into the block on iOS. */}
      <View accessibilityLiveRegion="polite" style={styles.copy}>
        <Text accessibilityRole="header" style={styles.title}>
          {t(messageKeys.titleKey)}
        </Text>
        <Text style={styles.body}>{t(messageKeys.bodyKey)}</Text>
      </View>
      <Button
        label={actionLabel}
        onPress={onPress}
        size="sm"
        testID={testID === undefined ? undefined : `${testID}-action`}
        variant="primary"
      />
    </View>
  );
}
