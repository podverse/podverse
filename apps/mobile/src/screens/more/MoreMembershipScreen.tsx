import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { createMobileApiRequestService } from '../../auth/mobileApi';
import { MembershipFeatureTable } from '../../components/membership/MembershipFeatureTable';
import { TrialLimitationsAccordion } from '../../components/membership/TrialLimitationsAccordion';
import { Button, Card } from '../../components/primitives';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import { SectionHeading } from '../../components/section/SectionHeading';
import { openCheckout } from '../../membership/checkoutEntry';
import { useMembership } from '../../membership/useMembership';
import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';

/**
 * Membership screen. Mirrors the web membership page's
 * intent (tiers, pricing, expired/trial messaging, single primary CTA) without pixel-copying. The CTA
 * is auth-based binary per plan: logged-out → Sign up, logged-in → Extend membership (same logged-in
 * path the gate modal labels "Renew"). Purchase itself is the web hand-off in `checkoutEntry` until
 * native IAP. All copy resolves through the shared `membership.*` catalog.
 */

/** The pricing fields this screen renders (subset of the API's `MembershipPricingData`). */
type MembershipPricing = {
  costMonthly: number;
  costAnnually: number;
  annuallySavingsPercent: number;
};

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
        cardBody: {
          gap: tokens.spacing.base,
          padding: tokens.spacing.lg,
        },
        cta: {
          marginBottom: tokens.spacing['4xl'],
          marginTop: tokens.spacing.sm,
        },
        featureSection: {
          marginBottom: tokens.spacing['4xl'],
        },
        priceRow: {
          ...typography.prose,
          color: themeStyles.textPrimary.color,
        },
        savings: {
          ...typography.body,
          color: themeStyles.textSecondary.color,
        },
        section: {
          marginBottom: tokens.spacing.lg,
        },
        status: {
          ...typography.prose,
          color: themeStyles.textPrimary.color,
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
              <SectionHeading>{t('membership.premium_membership')}</SectionHeading>
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

      <View style={styles.cta}>
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

      <View style={styles.featureSection}>
        <MembershipFeatureTable />
      </View>

      <TrialLimitationsAccordion testID="more-membership-trial-limitations" />
    </MobileScreenContainer>
  );
}
