'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import { MainHeader } from '@podverse/ui';

export const ClipEditPageHeader: React.FC = () => {
  const tFeatures = useTranslations('features');

  return <MainHeader title={tFeatures('clip.edit_clip')} />;
};
