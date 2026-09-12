'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import type { DTOPopularityTrackingAgreement } from '@podverse/helpers';
import { MainColumnStack } from '@podverse/ui';

import { PopularityTrackingAgreementPanel } from '../../components/PopularityTracking/PopularityTrackingAgreementPanel';
import { useAccount } from '../../contexts/Account';
import { useConfig } from '../../contexts/Config';
import { getApiRequestService } from '../../factories/apiRequestService';
import { isPopularityTrackingPromptRequiredForAccount } from '../../lib/popularityTrackingRequired';

export function PopularityTrackingGateClient() {
  const t = useTranslations('popularity_tracking');
  const router = useRouter();
  const { loggedInAccount } = useAccount();
  const config = useConfig();
  const [agreement, setAgreement] = useState<DTOPopularityTrackingAgreement | null>(null);
  const promptRequired = isPopularityTrackingPromptRequiredForAccount(
    loggedInAccount,
    config.public.legal.popularityTracking.version
  );

  useEffect(() => {
    if (loggedInAccount === null) {
      router.replace('/');
    }
  }, [loggedInAccount, router]);

  useEffect(() => {
    if (loggedInAccount !== null && !promptRequired) {
      router.replace('/');
    }
  }, [loggedInAccount, promptRequired, router]);

  useEffect(() => {
    if (loggedInAccount === null) {
      return;
    }
    let cancelled = false;
    void getApiRequestService()
      .reqLegalPopularityTracking()
      .then((data) => {
        if (!cancelled) {
          setAgreement(data);
        }
      })
      .catch((error: unknown) => {
        console.error('[PopularityTrackingGateClient] load failed:', error);
      });
    return () => {
      cancelled = true;
    };
  }, [loggedInAccount]);

  if (loggedInAccount === null || !promptRequired) {
    return null;
  }

  return (
    <MainColumnStack>
      <h1>{t('title')}</h1>
      <PopularityTrackingAgreementPanel
        agreement={agreement}
        onDecided={() => {
          router.replace('/');
        }}
      />
    </MainColumnStack>
  );
}
