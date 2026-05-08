'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import { MainHeader } from '@podverse/ui';

export const HistoryPageHeader: React.FC = () => {
  const tFeatures = useTranslations('features');

  return <MainHeader title={tFeatures('history.history')} />;
};
