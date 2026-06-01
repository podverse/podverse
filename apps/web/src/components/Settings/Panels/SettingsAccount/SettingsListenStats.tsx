'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { SwitchButton } from '@podverse/ui';

import { ROUTES } from '../../../../constants/routes';
import { useAccount } from '../../../../contexts/Account';
import { useConfig } from '../../../../contexts/Config';
import { getApiRequestService } from '../../../../factories/apiRequestService';
import { Link } from '../../../Link/Link';
import { showToast } from '../../../Toast/Toast';
import { SettingsSection } from '../../SettingsSection';

export function SettingsListenStats() {
  const tSettings = useTranslations('settings');
  const tMisc = useTranslations('misc');
  const config = useConfig();
  const { loggedInAccount, setLoggedInAccount } = useAccount();
  const [allowListenStats, setAllowListenStats] = useState(
    loggedInAccount?.account_settings?.allow_listen_stats ?? true
  );
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setAllowListenStats(loggedInAccount?.account_settings?.allow_listen_stats ?? true);
  }, [loggedInAccount]);

  const handleToggle = async (next: boolean) => {
    const previous = allowListenStats;
    setAllowListenStats(next);
    setIsUpdating(true);
    try {
      const updatedAccount = await getApiRequestService().reqAccountSettingsListenStatsUpdate({
        allow_listen_stats: next,
      });
      setLoggedInAccount(updatedAccount);
    } catch (error) {
      setAllowListenStats(previous);
      console.error('[SettingsListenStats] update failed:', error);
      showToast(tSettings('account.listen_stats_toggle_error'), 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <SettingsSection>
      <h3>{tSettings('account.listen_stats_toggle')}</h3>
      <SwitchButton
        id="listen-stats"
        label={tSettings('account.listen_stats_toggle')}
        checked={allowListenStats}
        onChange={handleToggle}
        loading={isUpdating}
        helpAriaLabel={tMisc('more_info')}
        helpText={tSettings('account.listen_stats_toggle_help', {
          retention_days: config.public.stats.trackEventRetentionDays,
        })}
        aria-describedby="listen-stats-help"
        stateOffLabel={tMisc('off')}
        stateOnLabel={tMisc('on')}
      />
      <p>
        {tSettings.rich('account.listen_stats_terms_link', {
          termsLink: (chunks) => <Link href={ROUTES.TERMS}>{chunks}</Link>,
        })}
      </p>
    </SettingsSection>
  );
}
