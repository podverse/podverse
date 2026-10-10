'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { getPopularityTrackingChoice, isPopularityTrackingAllowed } from '@podverse/helpers';
import { SwitchButton } from '@podverse/ui';

import { ROUTES } from '../../../../constants/routes';
import { useAccount } from '../../../../contexts/Account';
import { useConfig } from '../../../../contexts/Config';
import { getApiRequestService } from '../../../../factories/apiRequestService';
import { popularityTrackingStatusKey } from '../../../../lib/popularityTrackingStatus';
import { showToast } from '../../../Toast/Toast';
import { SettingsSection } from '../../SettingsSection';

export function SettingsListenStats() {
  const t = useTranslations('popularity_tracking');
  const tMisc = useTranslations('misc');
  const router = useRouter();
  const { loggedInAccount, setLoggedInAccount } = useAccount();
  const config = useConfig();
  const [isSaving, setIsSaving] = useState(false);
  const version = config.public.legal.popularityTracking.version;
  const choice = getPopularityTrackingChoice(loggedInAccount?.account_settings, version);
  const allowed = isPopularityTrackingAllowed(loggedInAccount?.account_settings, version);

  const turnOff = async () => {
    if (isSaving) {
      return;
    }
    setIsSaving(true);
    try {
      const updatedAccount = await getApiRequestService().reqAccountSettingsListenStatsUpdate({
        accepted: false,
      });
      setLoggedInAccount(updatedAccount);
    } catch (error) {
      console.error('[SettingsListenStats] update failed', error);
      showToast(t('error'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SettingsSection>
      <h3>{t('title')}</h3>
      <SwitchButton
        checked={allowed}
        helpAriaLabel={tMisc('more_info')}
        helpText={t(popularityTrackingStatusKey(choice))}
        id="popularity-tracking"
        label={t('title')}
        loading={isSaving}
        onChange={(next) => {
          if (!next) {
            void turnOff();
            return;
          }
          router.push(ROUTES.POPULARITY_TRACKING);
        }}
        stateOffLabel={tMisc('off')}
        stateOnLabel={tMisc('on')}
      />
    </SettingsSection>
  );
}
