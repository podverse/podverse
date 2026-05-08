'use client';

import { useTranslations } from 'next-intl';
import type { FC } from 'react';

import type { FeatureComparisonRow } from '@podverse/ui';
import { FeatureComparison as SharedFeatureComparison } from '@podverse/ui';

type Feature = {
  name: string;
  free: boolean;
  premium: boolean;
};

type FeatureComparisonProps = {
  features: Feature[];
};

export const FeatureComparison: FC<FeatureComparisonProps> = ({ features }) => {
  const t = useTranslations('membership');
  const tMisc = useTranslations('misc');

  const tiers = [
    { id: 'free', name: t('free') },
    { id: 'premium', name: t('premium') },
  ];

  const rows: FeatureComparisonRow[] = features.map((f) => ({
    name: f.name,
    available: { free: f.free, premium: f.premium },
  }));

  return (
    <SharedFeatureComparison
      tiers={tiers}
      features={rows}
      labels={{ feature: t('feature'), available: tMisc('available') }}
    />
  );
};
