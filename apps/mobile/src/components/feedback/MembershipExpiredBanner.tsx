import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getMembershipExpiryDismissalKey, getMembershipExpiryNotice } from '@podverse/helpers';

import { useMembership } from '../../membership/useMembership';
import { getPref, setPref } from '../../prefs/prefsStore';
import { useTheme } from '../../theme/useTheme';
import { Button } from '../primitives';

/**
 * Tells a member their membership is expiring soon, or has expired, and offers a way back to
 * membership.
 *
 * Expiring-soon dismissal is the dismissal key for that expiry, stored in prefs. Expired
 * dismissal lasts for this launch only and is not written to prefs, so the next launch shows it
 * again. The More screen keeps a row for a lapsed member.
 */
export type MembershipExpiredBannerProps = {
  onRenew: () => void;
};

let expiredDismissedThisLaunch = false;

export function MembershipExpiredBanner({ onRenew }: MembershipExpiredBannerProps) {
  const { t } = useTranslation();
  const membership = useMembership();
  const { styles: themeStyles, tokens } = useTheme();
  const notice = getMembershipExpiryNotice(membership);
  const dismissalKey = getMembershipExpiryDismissalKey(notice, membership.expiresAt);
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(notice.status !== 'expiring_soon');
  const [sessionExpiredDismissed, setSessionExpiredDismissed] = useState(
    expiredDismissedThisLaunch
  );

  useEffect(() => {
    if (notice.status !== 'expiring_soon') {
      setIsHydrated(true);
      return;
    }

    let isActive = true;
    setIsHydrated(false);

    void getPref('membership.expiry_dismissed_for').then((stored) => {
      if (isActive) {
        setDismissedFor(stored);
        setIsHydrated(true);
      }
    });

    return () => {
      isActive = false;
    };
  }, [notice.status]);

  const onDismiss = useCallback(() => {
    if (notice.status === 'expired') {
      expiredDismissedThisLaunch = true;
      setSessionExpiredDismissed(true);
      return;
    }
    if (dismissalKey === null) {
      return;
    }
    setDismissedFor(dismissalKey);
    void setPref('membership.expiry_dismissed_for', dismissalKey);
  }, [dismissalKey, notice.status]);

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

  if (notice.status === 'none') {
    return null;
  }
  if (notice.status === 'expired' && (expiredDismissedThisLaunch || sessionExpiredDismissed)) {
    return null;
  }
  if (notice.status === 'expiring_soon') {
    if (!isHydrated || (dismissalKey !== null && dismissedFor === dismissalKey)) {
      return null;
    }
  }

  let message: string;
  switch (notice.status) {
    case 'expired':
      message = t('membership.gate.banner_message');
      break;
    case 'expiring_soon': {
      const daysRemaining = notice.daysRemaining;
      if (daysRemaining === null) {
        return null;
      }
      // Singular and plural are separate keys: next-intl on web and i18next disagree on suffixes.
      message =
        daysRemaining === 1
          ? t('membership.gate.banner_message_expiring_tomorrow')
          : t('membership.gate.banner_message_expiring_soon', { days: daysRemaining });
      break;
    }
    default:
      return null;
  }

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
