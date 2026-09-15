'use client';

import { useTranslations } from 'next-intl';

import { isPopularityTrackingAllowed } from '@podverse/helpers';
import { Button } from '@podverse/ui';

import { useAccount } from '../../contexts/Account';
import { useConfig } from '../../contexts/Config';
import { getApiRequestService } from '../../factories/apiRequestService';
import { showToast } from '../Toast/Toast';

type PopularityTrackingDecisionActionsProps = {
  onDecided?: () => void;
  onToggleFullAgreement: () => void;
  showFullAgreement: boolean;
};

export function PopularityTrackingDecisionActions({
  onDecided,
  onToggleFullAgreement,
  showFullAgreement,
}: PopularityTrackingDecisionActionsProps) {
  const t = useTranslations('popularity_tracking');
  const config = useConfig();
  const { loggedInAccount, setLoggedInAccount } = useAccount();
  const currentVersion = config.public.legal.popularityTracking.version;
  const alreadyAgreed = isPopularityTrackingAllowed(
    loggedInAccount?.account_settings,
    currentVersion
  );

  const handleDecision = async (accepted: boolean) => {
    try {
      const updatedAccount = await getApiRequestService().reqAccountSettingsListenStatsUpdate({
        accepted,
      });
      setLoggedInAccount(updatedAccount);
      onDecided?.();
    } catch (error) {
      console.error('[PopularityTrackingDecisionActions] update failed:', error);
      showToast(t('error'), 'error');
    }
  };

  return (
    <div>
      {alreadyAgreed ? <p>{t('already_agreed')}</p> : null}
      <p>
        {t('agreement_date', {
          agreement_date: config.public.legal.popularityTracking.agreementDate,
        })}
      </p>
      <div>
        <Button type="button" variant="primary" onClick={() => void handleDecision(true)}>
          {t('yes')}
        </Button>
        <Button type="button" variant="secondary" onClick={() => void handleDecision(false)}>
          {t('no')}
        </Button>
        <Button
          type="button"
          variant="secondary"
          aria-expanded={showFullAgreement}
          onClick={onToggleFullAgreement}
        >
          {showFullAgreement ? t('back_to_choice') : t('learn_more')}
        </Button>
      </div>
    </div>
  );
}
