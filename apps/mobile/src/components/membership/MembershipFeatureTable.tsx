import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import { MEMBERSHIP_COMPARISON_FEATURES } from '@podverse/helpers';

import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';

const TIER_COLUMN_WIDTH = 92;
const CHECKMARK_SIZE = 28;

type TierMarkProps = {
  accentColor: string;
  available: boolean;
  availableLabel: string;
  cellStyle: ViewStyle;
};

function TierMark({ accentColor, available, availableLabel, cellStyle }: TierMarkProps) {
  return (
    <View accessibilityLabel={available ? availableLabel : undefined} style={cellStyle}>
      {available ? (
        <Ionicons
          accessibilityElementsHidden
          color={accentColor}
          importantForAccessibility="no"
          name="checkmark-sharp"
          size={CHECKMARK_SIZE}
        />
      ) : null}
    </View>
  );
}

export function MembershipFeatureTable() {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        comingSoon: {
          ...typography.prose,
          color: themeStyles.textPrimary.color,
          fontWeight: '700',
          textAlign: 'center',
        },
        comingSoonCell: {
          alignItems: 'center',
          alignSelf: 'stretch',
          backgroundColor: tokens.background.tertiary,
          borderLeftColor: themeStyles.border.borderColor,
          borderLeftWidth: 1,
          justifyContent: 'center',
          paddingHorizontal: tokens.spacing.sm,
          paddingVertical: tokens.spacing.base,
          width: TIER_COLUMN_WIDTH * 2,
        },
        featureCell: {
          ...typography.prose,
          color: themeStyles.textPrimary.color,
          flex: 1,
          minWidth: 0,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.base,
        },
        headerFeature: {
          flex: 1,
          justifyContent: 'center',
          minWidth: 0,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.base,
        },
        headerFeatureLabel: {
          ...typography.subheading,
          color: themeStyles.textPrimary.color,
        },
        headerTier: {
          alignItems: 'center',
          alignSelf: 'stretch',
          borderLeftColor: themeStyles.border.borderColor,
          borderLeftWidth: 1,
          justifyContent: 'center',
          paddingHorizontal: tokens.spacing.sm,
          paddingVertical: tokens.spacing.base,
          width: TIER_COLUMN_WIDTH,
        },
        headerTierLabel: {
          ...typography.subheading,
          color: themeStyles.textPrimary.color,
          textAlign: 'center',
        },
        row: {
          alignItems: 'stretch',
          borderBottomColor: themeStyles.border.borderColor,
          borderBottomWidth: 1,
          flexDirection: 'row',
        },
        rowLast: {
          borderBottomWidth: 0,
        },
        table: {
          borderColor: themeStyles.border.borderColor,
          borderWidth: 1,
        },
        tierCell: {
          alignItems: 'center',
          alignSelf: 'stretch',
          borderLeftColor: themeStyles.border.borderColor,
          borderLeftWidth: 1,
          justifyContent: 'center',
          width: TIER_COLUMN_WIDTH,
        },
      }),
    [themeStyles, tokens]
  );

  const availableLabel = t('misc.available');
  const lastFeatureIndex = MEMBERSHIP_COMPARISON_FEATURES.length - 1;

  return (
    <View testID="more-membership-feature-table">
      <View style={styles.table}>
        <View style={styles.row}>
          <View style={styles.headerFeature}>
            <Text style={styles.headerFeatureLabel}>{t('membership.features')}</Text>
          </View>
          <View style={styles.headerTier}>
            <Text style={styles.headerTierLabel}>{t('membership.free')}</Text>
          </View>
          <View style={styles.headerTier}>
            <Text style={styles.headerTierLabel}>{t('membership.premium')}</Text>
          </View>
        </View>
        {MEMBERSHIP_COMPARISON_FEATURES.map((feature, index) => (
          <View
            key={feature.nameKey}
            style={index === lastFeatureIndex ? [styles.row, styles.rowLast] : styles.row}
          >
            <Text style={styles.featureCell}>{t(`membership.comparison.${feature.nameKey}`)}</Text>
            {feature.comingSoon === true ? (
              <View
                accessibilityLabel={t('membership.coming_soon')}
                accessibilityRole="text"
                style={styles.comingSoonCell}
              >
                <Text style={styles.comingSoon}>{t('membership.coming_soon')}</Text>
              </View>
            ) : (
              <>
                <TierMark
                  accentColor={tokens.text.accent}
                  available={feature.free}
                  availableLabel={availableLabel}
                  cellStyle={styles.tierCell}
                />
                <TierMark
                  accentColor={tokens.text.accent}
                  available={feature.premium}
                  availableLabel={availableLabel}
                  cellStyle={styles.tierCell}
                />
              </>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}
