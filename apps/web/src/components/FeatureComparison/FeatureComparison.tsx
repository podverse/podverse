'use client';

import { useTranslations } from 'next-intl';
import type { FC } from 'react';

import type { MembershipComparisonFeature } from '@podverse/helpers';
import { membershipComparisonIsMobileOnly } from '@podverse/helpers';
import type { FeatureComparisonRow } from '@podverse/ui';
import { FeatureComparison as SharedFeatureComparison } from '@podverse/ui';

type FeatureComparisonProps = {
  features: readonly MembershipComparisonFeature[];
};

export const FeatureComparison: FC<FeatureComparisonProps> = ({ features }) => {
  const t = useTranslations('membership');
  const tMisc = useTranslations('misc');

  const tiers = [
    { id: 'free', name: t('free') },
    { id: 'premium', name: t('premium') },
  ];

  const rows: FeatureComparisonRow[] = features.map((feature) => {
    const name = t(`comparison.${feature.nameKey}`);
    const isMobileOnly = membershipComparisonIsMobileOnly(feature);

    return {
      name: isMobileOnly ? t('comparison_name_mobile_only', { name }) : name,
      available: { free: feature.free, premium: feature.premium },
      comingSoon: feature.comingSoon,
      mobileOnly: isMobileOnly,
    };
  });

  return (
    <SharedFeatureComparison
      tiers={tiers}
      features={rows}
      labels={{
        available: tMisc('available'),
        comingSoon: t('coming_soon'),
        feature: t('feature'),
        mobileOnlyLegend: t('mobile_only_legend'),
      }}
    />
  );
};
