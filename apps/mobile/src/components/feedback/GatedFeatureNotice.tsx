import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import type { FeatureAccess } from '@podverse/helpers';

import { useTheme } from '../../theme/useTheme';
import { Button } from '../primitives';

/**
 * The one inline presentation for a capability the user cannot use. A gated control shows
 * this instead of disappearing or failing silently: the user always learns what is missing and gets
 * the action that fixes it.
 *
 * Renders nothing when access is allowed, so a call site can mount it unconditionally next to the
 * control it explains.
 *
 * The reason→copy mapping lives here rather than at call sites, so every gated control across the
 * app explains itself in the same words.
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

  const title =
    reason === 'needs_account'
      ? t('membership.gate.title_needs_account')
      : reason === 'limit_reached'
        ? t('membership.gate.title_limit')
        : reason === 'membership_expired'
          ? t('membership.gate.title_expired')
          : t('membership.gate.title_premium');

  const body =
    reason === 'needs_account'
      ? t('membership.gate.body_needs_account')
      : reason === 'limit_reached'
        ? t('membership.gate.body_limit')
        : reason === 'membership_expired'
          ? t('membership.gate.body_expired')
          : t('membership.gate.body_premium');

  const actionLabel =
    reason === 'needs_account'
      ? t('authentication.login')
      : reason === 'membership_expired'
        ? t('membership.gate.renew')
        : t('membership.get_premium');

  const onPress = reason === 'needs_account' ? onRequestLogin : onRequestMembership;

  return (
    <View style={styles.container} testID={testID}>
      {/* Not `accessible` as a group: that collapses the button into the block on iOS. */}
      <View accessibilityLiveRegion="polite" style={styles.copy}>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        <Text style={styles.body}>{body}</Text>
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
