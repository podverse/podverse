import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { useMembership } from '../../membership/useMembership';
import { useTheme } from '../../theme/useTheme';
import { Button } from '../primitives';

/**
 * Persistent, non-alarming banner shown to logged-in users whose membership has expired (web parity:
 * `MembershipExpiredBanner`). Renders nothing otherwise. The renew action is provided by the host so
 * this component never imports the navigator (avoids an import cycle).
 */
export type MembershipExpiredBannerProps = {
  onRenew: () => void;
};

export function MembershipExpiredBanner({ onRenew }: MembershipExpiredBannerProps) {
  const { t } = useTranslation();
  const { isExpired } = useMembership();
  const { styles: themeStyles, tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          alignItems: 'center',
          backgroundColor: tokens.background.secondary,
          borderBottomColor: themeStyles.border.borderColor,
          borderBottomWidth: 1,
          flexDirection: 'row',
          gap: tokens.spacing.md,
          justifyContent: 'space-between',
          paddingHorizontal: tokens.spacing.lg,
          paddingVertical: tokens.spacing.md,
        },
        message: {
          color: themeStyles.textPrimary.color,
          flex: 1,
          fontSize: 14,
        },
      }),
    [themeStyles, tokens]
  );

  if (!isExpired) {
    return null;
  }

  return (
    <View style={styles.container} testID="membership-expired-banner">
      <Text style={styles.message}>{t('membership.gate.banner_message')}</Text>
      <Button
        label={t('membership.gate.banner_action')}
        onPress={onRenew}
        size="sm"
        testID="membership-expired-banner-renew"
        variant="primary"
      />
    </View>
  );
}
