import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getMembershipExpiryNotice, shouldSuppressExpiryReminder } from '@podverse/helpers';

import { useMembership } from '../../membership/useMembership';
import { getPref, setPref } from '../../prefs/prefsStore';
import { useTheme } from '../../theme/useTheme';
import { Button } from '../primitives';

/**
 * Tells a member their membership is expiring soon, or has expired, and offers a way to renew.
 *
 * The state is derived on demand from the account snapshot already in memory, so it is correct
 * whenever the screen renders.
 *
 * Dismissal is remembered against the expiry it was dismissed for, so a later lapse shows the
 * banner again. The More screen keeps a non-dismissible renewal row, so dismissing here never
 * removes the path to renew.
 */
export type MembershipExpiredBannerProps = {
  onRenew: () => void;
};

export function MembershipExpiredBanner({ onRenew }: MembershipExpiredBannerProps) {
  const { t } = useTranslation();
  const membership = useMembership();
  const { styles: themeStyles, tokens } = useTheme();
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  const notice = getMembershipExpiryNotice(membership);
  const dismissalKey = membership.expiresAt ?? 'unknown';

  useEffect(() => {
    let isActive = true;

    void getPref('membership.expiry_dismissed_for').then((stored) => {
      if (isActive) {
        setDismissedFor(stored);
        setIsHydrated(true);
      }
    });

    return () => {
      isActive = false;
    };
  }, []);

  const onDismiss = useCallback(() => {
    setDismissedFor(dismissalKey);
    void setPref('membership.expiry_dismissed_for', dismissalKey);
  }, [dismissalKey]);

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
        dismiss: {
          color: themeStyles.textSecondary.color,
          fontSize: 18,
          paddingHorizontal: tokens.spacing.xs,
        },
        message: {
          color: themeStyles.textPrimary.color,
          flex: 1,
          fontSize: 14,
        },
      }),
    [themeStyles, tokens]
  );

  // Wait for the stored dismissal before the first paint, so a dismissed banner never flashes in.
  if (
    notice.status === 'none' ||
    !isHydrated ||
    dismissedFor === dismissalKey ||
    shouldSuppressExpiryReminder()
  ) {
    return null;
  }

  // Explicit singular/plural keys rather than i18next `count` pluralization: the same catalog is
  // read by next-intl on web, and the two libraries disambiguate plural suffixes differently.
  // `daysRemaining` is a ceiling of a positive remainder here, so 1 is the smallest case.
  const daysRemaining = notice.daysRemaining ?? 1;
  const message =
    notice.status === 'expired'
      ? t('membership.gate.banner_message')
      : daysRemaining === 1
        ? t('membership.gate.banner_message_expiring_tomorrow')
        : t('membership.gate.banner_message_expiring_soon', { days: daysRemaining });

  return (
    <View style={styles.container} testID="membership-expired-banner">
      <Text style={styles.message}>{message}</Text>
      <Button
        label={t('membership.gate.banner_action')}
        onPress={onRenew}
        size="sm"
        testID="membership-expired-banner-renew"
        variant="primary"
      />
      <Pressable
        accessibilityLabel={t('membership.gate.banner_dismiss')}
        accessibilityRole="button"
        onPress={onDismiss}
        testID="membership-expired-banner-dismiss"
      >
        <Text style={styles.dismiss}>✕</Text>
      </Pressable>
    </View>
  );
}
