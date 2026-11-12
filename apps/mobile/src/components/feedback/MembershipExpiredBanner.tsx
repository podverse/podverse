import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  getMembershipExpiryDismissalKey,
  getMembershipExpiryNotice,
} from '@podverse/helpers';

import { useMembership } from '../../membership/useMembership';
import { getPref, setPref } from '../../prefs/prefsStore';
import {
  bottomChromeStripContainerLayout,
  bottomChromeStripTextStyle,
} from '../../theme/bottomChromeStrip';
import { useTheme } from '../../theme/useTheme';
import { setMembershipExpiryStripVisible } from './membershipExpiryStripPresence';

/**
 * Slim strip above the mini player when membership is expiring soon or has expired. Lives in the
 * persistent bottom chrome so it stays fixed across stack pushes and never displaces screen content.
 *
 * Expiring-soon dismissal is the dismissal key for that expiry, stored in prefs. Expired dismissal
 * lasts for this launch only and is not written to prefs, so the next launch shows it again. The
 * More screen keeps a row for a lapsed member. Tapping the message opens Membership; the dismiss
 * control hides the strip.
 */
export type MembershipExpiredBannerProps = {
  onRenew: () => void;
};

let expiredDismissedThisLaunch = false;

export function MembershipExpiredBanner({ onRenew }: MembershipExpiredBannerProps) {
  const { t } = useTranslation();
  const membership = useMembership();
  const { tokens } = useTheme();
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

  const isVisible = useMemo(() => {
    if (notice.status === 'none') {
      return false;
    }
    if (notice.status === 'expired' && (expiredDismissedThisLaunch || sessionExpiredDismissed)) {
      return false;
    }
    if (notice.status === 'expiring_soon') {
      if (!isHydrated || (dismissalKey !== null && dismissedFor === dismissalKey)) {
        return false;
      }
      if (notice.daysRemaining === null) {
        return false;
      }
    }
    return notice.status === 'expired' || notice.status === 'expiring_soon';
  }, [dismissalKey, dismissedFor, isHydrated, notice, sessionExpiredDismissed]);

  useLayoutEffect(() => {
    setMembershipExpiryStripVisible(isVisible);
  }, [isVisible]);

  useLayoutEffect(() => {
    return () => {
      setMembershipExpiryStripVisible(false);
    };
  }, []);

  const isExpired = notice.status === 'expired';
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          alignItems: 'center',
          backgroundColor: isExpired ? tokens.background.error : tokens.background.warning,
          borderTopColor: isExpired ? tokens.border.error : tokens.border.warning,
          borderTopWidth: StyleSheet.hairlineWidth,
          flexDirection: 'row',
          gap: tokens.spacing.sm,
          ...bottomChromeStripContainerLayout(tokens.spacing),
        },
        dismiss: {
          ...bottomChromeStripTextStyle(),
          color: isExpired ? tokens.text.danger : tokens.text.warning,
          paddingHorizontal: tokens.spacing.xs,
        },
        message: {
          ...bottomChromeStripTextStyle(),
          color: isExpired ? tokens.text.danger : tokens.text.warning,
        },
        messagePressable: {
          flex: 1,
        },
      }),
    [isExpired, tokens]
  );

  if (!isVisible) {
    return null;
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
    <View
      accessibilityLiveRegion="polite"
      style={styles.container}
      testID="membership-expired-banner"
    >
      <Pressable
        accessibilityLabel={message}
        accessibilityRole="button"
        onPress={onRenew}
        style={styles.messagePressable}
        testID="membership-expired-banner-renew"
      >
        <Text numberOfLines={1} style={styles.message}>
          {message}
        </Text>
      </Pressable>
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
