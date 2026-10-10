import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { BillingLocalizedPrice } from '../../billing/BillingClient';
import type { CheckoutProcessorOffer, StoreCheckoutCadence } from '../../membership/storeCheckout';
import { checkoutProduct } from '../../membership/storeCheckout';
import type { CatalogPricing } from '../../membership/useStoreCheckout';
import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import { Badge } from '../primitives';

const formatCatalogUsd = (amount: number): string => {
  const dollars = Math.round(amount * 100) / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
};

export type MembershipCheckoutPlansProps = {
  cadences: readonly StoreCheckoutCadence[];
  catalogPricing: CatalogPricing | null;
  onSelect: (cadence: StoreCheckoutCadence) => void;
  prices: readonly BillingLocalizedPrice[];
  processorId: string;
  processors: readonly CheckoutProcessorOffer[];
  selectedCadence: StoreCheckoutCadence;
};

export function MembershipCheckoutPlans({
  cadences,
  catalogPricing,
  onSelect,
  prices,
  processorId,
  processors,
  selectedCadence,
}: MembershipCheckoutPlansProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        plan: {
          backgroundColor: tokens.background.secondary,
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.md,
          borderWidth: 1,
          flex: 1,
          gap: tokens.spacing.sm,
          padding: tokens.spacing.lg,
        },
        planName: {
          ...typography.subheading,
          color: themeStyles.textPrimary.color,
        },
        planPeriod: {
          ...typography.body,
          color: themeStyles.textSecondary.color,
        },
        planPrice: {
          ...typography.title,
          color: themeStyles.textPrimary.color,
        },
        planRow: {
          flexDirection: 'row',
          gap: tokens.spacing.sm,
        },
        planSelected: {
          borderColor: themeStyles.buttonPrimary.backgroundColor,
        },
      }),
    [themeStyles, tokens]
  );

  const displayPriceFor = (externalProductId: string): string | null => {
    const match = prices.find((item) => item.productId === externalProductId);
    return match === undefined ? null : match.displayPrice;
  };

  const planPrice = (value: StoreCheckoutCadence): string | null => {
    const catalogAmount =
      catalogPricing === null
        ? null
        : value === 'monthly'
          ? catalogPricing.costMonthly
          : catalogPricing.costAnnually;
    if (catalogAmount !== null) {
      return formatCatalogUsd(catalogAmount);
    }
    const offer = checkoutProduct(processors, processorId, value);
    return offer === null ? null : displayPriceFor(offer.externalProductId);
  };

  const percentOff =
    catalogPricing !== null &&
    Number.isFinite(catalogPricing.annuallySavingsPercent) &&
    catalogPricing.annuallySavingsPercent > 0
      ? catalogPricing.annuallySavingsPercent
      : null;

  return (
    <View style={styles.planRow} testID="membership-checkout-cadence">
      {cadences.map((value) => {
        const selected = value === selectedCadence;
        const name =
          value === 'monthly' ? t('membership.pricing_monthly') : t('membership.pricing_annually');
        const period =
          value === 'monthly'
            ? t('membership.pricing_per_month')
            : t('membership.pricing_per_year');
        const price = planPrice(value);
        const savings =
          value === 'annual' && percentOff !== null
            ? t('membership.pricing_percent_off', { percent: percentOff })
            : null;
        const priceLabel = price === null ? name : `${name}, ${price}${period}`;
        return (
          <Pressable
            accessibilityLabel={savings === null ? priceLabel : `${priceLabel}, ${savings}`}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            key={value}
            onPress={() => {
              onSelect(value);
            }}
            style={[styles.plan, selected ? styles.planSelected : null]}
            testID={`membership-checkout-cadence-${value}`}
          >
            <Text style={styles.planName}>{name}</Text>
            {price !== null ? (
              <Text style={styles.planPrice} testID={`membership-checkout-price-${value}`}>
                {price}
              </Text>
            ) : null}
            {price !== null ? <Text style={styles.planPeriod}>{period}</Text> : null}
            {savings !== null ? (
              <Badge label={savings} testID="membership-checkout-percent-off" tone="accent" />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
