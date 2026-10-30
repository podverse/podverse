'use client';

import { useTranslations } from 'next-intl';

export const ContentRemoteItemsHeader = () => {
  const tInfo = useTranslations('info');

  return <h3>{tInfo('remote_items')}</h3>;
};
