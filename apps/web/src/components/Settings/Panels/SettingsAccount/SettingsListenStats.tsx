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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    let cancelled = false;
    void getApiRequestService()
      .reqLegalPopularityTracking()
      .then((data) => {
        if (!cancelled) {
          setAgreement(data);
          setHasError(false);
        }
      })
      .catch((error: unknown) => {
        console.error('[SettingsListenStats] load failed:', error);
        if (!cancelled) {
          setHasError(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SettingsSection>
      <h3>{t('title')}</h3>
      <PopularityTrackingAgreementPanel
        agreement={agreement}
        hasError={hasError}
        isLoading={isLoading}
      />
    </SettingsSection>
  );
}
