'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import type { DTOPopularityTrackingAgreement } from '@podverse/helpers';

import { getApiRequestService } from '../../../../factories/apiRequestService';
import { PopularityTrackingAgreementPanel } from '../../../PopularityTracking/PopularityTrackingAgreementPanel';
import { SettingsSection } from '../../SettingsSection';

export function SettingsListenStats() {
  const t = useTranslations('popularity_tracking');
  const [agreement, setAgreement] = useState<DTOPopularityTrackingAgreement | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getApiRequestService()
      .reqLegalPopularityTracking()
      .then((data) => {
        if (!cancelled) {
          setAgreement(data);
        }
      })
      .catch((error: unknown) => {
        console.error('[SettingsListenStats] load failed:', error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SettingsSection>
      <h3>{t('title')}</h3>
      <PopularityTrackingAgreementPanel agreement={agreement} />
    </SettingsSection>
  );
}
