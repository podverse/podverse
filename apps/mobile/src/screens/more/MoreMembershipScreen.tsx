import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { createMobileApiRequestService } from '../../auth/mobileApi';
import { Button } from '../../components/primitives';
import { Card } from '../../components/primitives/Card';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import { openCheckout } from '../../membership/checkoutEntry';
import { useMembership } from '../../membership/useMembership';
import { useTheme } from '../../theme/useTheme';

/**
 * Membership screen. Mirrors the web membership page's
 * intent (tiers, pricing, expired/trial messaging, single primary CTA) without pixel-copying. The CTA
 * is auth-based binary per plan: logged-out → Sign Up, logged-in → Extend Membership (same logged-in
 * path the gate modal labels "Renew"). Purchase itself is the web hand-off in `checkoutEntry` until
 * native IAP. All copy resolves through the shared `membership.*` catalog.
 */

/** The pricing fields this screen renders (subset of the API's `MembershipPricingData`). */
type MembershipPricing = {
  costMonthly: number;
  costAnnually: number;
  annuallySavingsPercent: number;
};

/** Real Trial-vs-Premium differentiators (web `trial_limitations_*`) — no invented product claims. */
const PREMIUM_UNLOCK_KEYS = [
  'membership.trial_limitations_directory_add_by_rss',
  'membership.trial_limitations_add_by_rss_feed_limit',
  'membership.trial_limitations_manual_refresh_limit',
  'membership.trial_limitations_stats_tracking',
  'membership.trial_limitations_notifications',
] as const;

export function MoreMembershipScreen() {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { expiresAt, isExpired, isLoggedIn, isMember, tier } = useMembership();
  const [pricing, setPricing] = useState<MembershipPricing | null>(null);

  useEffect(() => {
    let isActive = true;

    void (async () => {
      // Pricing is a public endpoint (no auth). Degrade gracefully: any failure just hides prices.
      const api = createMobileApiRequestService();
      if (api === null) {
        return;
      }
      try {
        const response = await api.reqMembershipGetPricing();
        if (isActive && 'data' in response) {
          setPricing({
            annuallySavingsPercent: response.data.annuallySavingsPercent,
            costAnnually: response.data.costAnnually,
            costMonthly: response.data.costMonthly,
          });
        }
      } catch {
        // Pricing is optional; keep the CTA.
      }
    })();

    return () => {
      isActive = false;
    };
  }, []);

  const statusLines = useMemo<string[]>(() => {
    if (!isLoggedIn) {
      return [t('membership.cta_sign_up_text')];
    }
    if (isExpired) {
      return tier === 'trial'
        ? [t('membership.trial_expired_text_line1'), t('membership.trial_expired_text_line2')]
        : [
            t('membership.membership_expired_text_line1'),
            t('membership.membership_expired_text_line2'),
          ];
    }
    if (isMember && tier === 'trial') {
      return [t('membership.cta_upgrade_text')];
    }
    if (isMember && tier === 'premium' && expiresAt !== null) {
      return [
        t('membership.your_membership_expires_on', {
          date: new Date(expiresAt).toLocaleDateString(),
        }),
      ];
    }
    return [];
  }, [expiresAt, isExpired, isLoggedIn, isMember, t, tier]);

  const ctaLabel = isLoggedIn ? t('membership.extend_my_membership') : t('authentication.sign_up');

  const styles = useMemo(
    () =>
      StyleSheet.create({
        bullet: {
          color: themeStyles.textSecondary.color,
          fontSize: 14,
        },
        cardBody: {
          gap: tokens.spacing.sm,
          padding: tokens.spacing.lg,
        },
        cardHeading: {
          color: themeStyles.textPrimary.color,
          fontSize: 16,
          fontWeight: '700',
        },
        cta: {
          marginTop: tokens.spacing.sm,
        },
        priceRow: {
          color: themeStyles.textPrimary.color,
          fontSize: 15,
        },
        savings: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
        },
        section: {
          marginBottom: tokens.spacing.lg,
        },
        status: {
          color: themeStyles.textPrimary.color,
          fontSize: 15,
        },
        tierLabels: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          fontWeight: '600',
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <MobileScreenContainer testID="more-membership-screen">
      {statusLines.length > 0 ? (
        <View style={styles.section} testID="more-membership-status">
          {statusLines.map((line, index) => (
            <Text key={`${index}-${line}`} style={styles.status}>
              {line}
            </Text>
          ))}
        </View>
      ) : null}

      {pricing !== null ? (
        <View style={styles.section}>
          <Card padded={false} testID="more-membership-pricing">
            <View style={styles.cardBody}>
              <Text style={styles.cardHeading}>{t('membership.premium_membership')}</Text>
              <Text style={styles.priceRow}>
                {`$${pricing.costMonthly}${t('membership.pricing_per_month')}`}
              </Text>
              <Text style={styles.priceRow}>
                {`$${pricing.costAnnually}${t('membership.pricing_per_year')}`}
              </Text>
              <Text style={styles.savings}>
                {t('membership.pricing_save_percent', { percent: pricing.annuallySavingsPercent })}
              </Text>
            </View>
          </Card>
        </View>
      ) : null}

      <View style={[styles.section, styles.cta]}>
        <Button
          fullWidth
          label={ctaLabel}
          onPress={() => {
            void openCheckout({ mode: isLoggedIn ? 'extend' : 'sign_up' });
          }}
          testID="more-membership-cta"
          variant="primary"
        />
      </View>

      <View style={styles.section}>
        <Card padded={false} testID="more-membership-tiers">
          <View style={styles.cardBody}>
            <Text style={styles.cardHeading}>{t('membership.features')}</Text>
            <Text style={styles.tierLabels}>
              {`${t('membership.free')} · ${t('membership.premium')}`}
            </Text>
            <Text style={styles.bullet}>{t('membership.trial_limitations_summary')}</Text>
            {PREMIUM_UNLOCK_KEYS.map((key) => (
              <Text key={key} style={styles.bullet}>
                {`• ${t(key)}`}
              </Text>
            ))}
          </View>
        </Card>
      </View>
    </MobileScreenContainer>
  );
}
