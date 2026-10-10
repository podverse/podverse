'use client';

import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Button, Divider } from '@podverse/ui';

import { ModalDeleteAccount } from '../../components/Settings/Panels/SettingsAccount/ModalDeleteAccount';
import { SettingsMembership } from '../../components/Settings/Panels/SettingsAccount/SettingsMembership';
import { SettingsSection } from '../../components/Settings/SettingsSection';
import { dismissToast, showToast, showToastLoading } from '../../components/Toast/Toast';
import { ROUTES } from '../../constants/routes';
import { useAccount } from '../../contexts/Account';
import { useConfig } from '../../contexts/Config';
import { getApiRequestService } from '../../factories/apiRequestService';
import { isTermsAcceptanceRequired } from '../../lib/termsAcceptanceRequired';
import { clearAddByRSSCredentialsForSignOut } from '../../utils/addByRSS/credentialStore';
import { handleRateLimitAlert } from '../../utils/rateLimit/rateLimitAlert';

import styles from './AccountAccess.module.scss';

export function AccountAccessClient() {
  const t = useTranslations('account_access');
  const tSettings = useTranslations('settings');
  const tMisc = useTranslations('misc');
  const locale = useLocale();
  const router = useRouter();
  const config = useConfig();
  const { loggedInAccount } = useAccount();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const termsRequired = isTermsAcceptanceRequired(
    loggedInAccount,
    config.public.legal.terms.version
  );

  useEffect(() => {
    if (loggedInAccount === null) {
      router.replace('/');
      return;
    }
    if (!termsRequired) {
      router.replace(ROUTES.SETTINGS);
    }
  }, [loggedInAccount, router, termsRequired]);

  if (loggedInAccount === null || !termsRequired) {
    return null;
  }

  const userEmail = loggedInAccount.account_credentials?.email || '';

  const handleReviewTerms = () => {
    router.push('/');
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await clearAddByRSSCredentialsForSignOut(loggedInAccount.id_text);
      await getApiRequestService().reqAuthLogout();
    } catch (error) {
      console.error('[AccountAccess.signOut] Error:', error);
    }
    window.location.assign('/');
  };

  const handleDownloadData = async () => {
    setIsDownloading(true);
    const loadingToastId = await showToastLoading(tSettings('account.download_my_data_loading'));

    try {
      const blob: Blob = await getApiRequestService().reqAccountDownloadData();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `podverse-data-export-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      dismissToast(loadingToastId);
      showToast(tSettings('account.download_my_data_success'), 'success');
    } catch (error) {
      console.error('[AccountAccess.downloadData] Error:', error);
      dismissToast(loadingToastId);
      const rateLimitErrorHandled = await handleRateLimitAlert(error, locale, tMisc);
      if (!rateLimitErrorHandled) {
        showToast(tSettings('account.download_my_data_error'), 'error');
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const handleExportOpml = async () => {
    setIsExporting(true);
    const loadingToastId = await showToastLoading(tSettings('opml.export_loading'));

    try {
      const blob = (await getApiRequestService().reqAccountOpmlExport()) as Blob;
      const filename = `podverse-opml-export-${new Date().toISOString().split('T')[0]}.opml`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      dismissToast(loadingToastId);
      showToast(tSettings('opml.export_success'), 'success');
    } catch (error) {
      dismissToast(loadingToastId);
      const rateLimitErrorHandled = await handleRateLimitAlert(error, locale, tMisc);
      if (!rateLimitErrorHandled) {
        showToast(tSettings('opml.export_error'), 'error');
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <main aria-label={t('title')} className={styles.screen} data-testid="account-access">
      <div className={styles.panel}>
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.message}>{t('message')}</p>

        <div className={styles.primaryActions}>
          <Button type="button" variant="primary" onClick={handleReviewTerms}>
            {t('review_terms')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              void handleSignOut();
            }}
            isLoading={isSigningOut}
            disabled={isSigningOut}
          >
            {t('sign_out')}
          </Button>
        </div>

        <Divider withSpacing />

        <SettingsMembership showCheckoutActions={false} />

        <Divider withSpacing />

        <SettingsSection>
          <h3>{t('download_heading')}</h3>
          <Button
            type="button"
            onClick={() => {
              void handleDownloadData();
            }}
            variant="primary"
            description={t('download_description')}
            isLoading={isDownloading}
            disabled={isDownloading}
          >
            {t('download_button')}
          </Button>
        </SettingsSection>

        <Divider withSpacing />

        <SettingsSection>
          <h3>{t('opml_heading')}</h3>
          <Button
            type="button"
            onClick={() => {
              void handleExportOpml();
            }}
            variant="primary"
            description={t('opml_description')}
            isLoading={isExporting}
            disabled={isExporting}
          >
            {t('opml_button')}
          </Button>
        </SettingsSection>

        <Divider withSpacing />

        <SettingsSection>
          <h3>{t('delete_heading')}</h3>
          <Button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            variant="danger"
            description={t('delete_description')}
          >
            {t('delete_button')}
          </Button>
          <ModalDeleteAccount
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            userEmail={userEmail}
          />
        </SettingsSection>
      </div>
    </main>
  );
}
