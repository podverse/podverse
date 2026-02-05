'use client';

import { useTranslations } from 'next-intl';
import React from 'react';
import { MainHeader } from '../../../../components/Main/MainHeader';

export const ClipEditPageHeader: React.FC = () => {
  const tFeatures = useTranslations('features');

  return <MainHeader title={tFeatures('clip.edit_clip')} />;
};
