'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import { MainHeader } from '@podverse/ui';

export const PlaylistEditPageHeader: React.FC = () => {
  const tFeatures = useTranslations('features');

  return <MainHeader title={tFeatures('playlist.edit_playlist')} />;
};
