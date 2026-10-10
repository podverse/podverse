import * as FileSystem from 'expo-file-system/legacy';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Share, StyleSheet, Text, View } from 'react-native';

import type { DTOBillingStatus } from '@podverse/helpers';
import { formatDateAbbrev } from '@podverse/helpers';

import { requestWithMobileAuthRefresh, useAuth } from '../auth';
import { ConfirmDialog } from '../components/feedback/ConfirmDialog';
import { Button, Card } from '../components/primitives';
import { isMobileE2eFromEnv } from '../config/env';
import { useTheme } from '../theme/useTheme';

type AccountAccessPanelProps = {
  onReviewTerms: () => void;
};

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index] ?? 0);
  }
  return btoa(binary);
}

export function AccountAccessPanel({ onReviewTerms }: AccountAccessPanelProps) {
  const { t, i18n } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const {
    accessToken,
    account,
    clearSession,
    logout,
    refreshToken,
    setAccount,
    setTokens,
  } = useAuth();
  const [status, setStatus] = useState<DTOBillingStatus | null>(null);
  const [membershipFailed, setMembershipFailed] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [noticeKey, setNoticeKey] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        description: {
          color: themeStyles.textSecondary.color,
          fontSize: 15,
          marginBottom: tokens.spacing.md,
        },
        error: {
          color: themeStyles.textPrimary.color,
          fontSize: 14,
          marginBottom: tokens.spacing.md,
        },
        fieldLabel: {
          color: themeStyles.textSecondary.color,
          fontSize: 14,
        },
        fieldRow: {
          flexDirection: 'row',
          gap: tokens.spacing.md,
          marginBottom: tokens.spacing.sm,
        },
        fieldValue: {
          color: themeStyles.textPrimary.color,
          flex: 1,
          fontSize: 14,
        },
        message: {
          color: themeStyles.textSecondary.color,
          fontSize: 16,
          marginBottom: tokens.spacing.lg,
        },
        notice: {
          color: themeStyles.textPrimary.color,
          fontSize: 14,
          marginBottom: tokens.spacing.md,
        },
        primaryActions: {
          gap: tokens.spacing.md,
          marginBottom: tokens.spacing.xl,
        },
        section: {
          marginBottom: tokens.spacing.lg,
        },
        sectionTitle: {
          color: themeStyles.textPrimary.color,
          fontSize: 18,
          fontWeight: '600',
          marginBottom: tokens.spacing.sm,
        },
        title: {
          color: themeStyles.textPrimary.color,
          fontSize: 24,
          fontWeight: '600',
          marginBottom: tokens.spacing.md,
        },
      }),
    [themeStyles, tokens]
  );

  useEffect(() => {
    let active = true;
    void requestWithMobileAuthRefresh(
      { accessToken, clearSession, refreshToken, setTokens },
      async (api) => api.reqBillingGetStatus()
    )
      .then((next) => {
        if (active) {
          setStatus(next);
          setMembershipFailed(false);
        }
      })
      .catch(() => {
        if (active) {
          setMembershipFailed(true);
          setStatus(null);
        }
      });
    return () => {
      active = false;
    };
  }, [accessToken, clearSession, refreshToken, setTokens]);

  let tierLabel = t('settings.membership.tier_none');
  if (status !== null && status.is_entitled && status.tier === 'premium') {
    tierLabel = t('settings.membership.tier_premium');
  } else if (status !== null && status.is_entitled && status.tier === 'trial') {
    tierLabel = t('settings.membership.tier_trial');
  } else if (status !== null && !status.is_entitled && status.tier !== null) {
    tierLabel = t('settings.membership.tier_expired');
  }

  const expiresOn =
    status?.membership_expires_at !== null && status?.membership_expires_at !== undefined
      ? formatDateAbbrev(status.membership_expires_at, i18n.language)
      : null;

  const handleDownload = async () => {
    setIsDownloading(true);
    setErrorKey(null);
    setNoticeKey('settings.account.download_my_data_loading');

    try {
      const blob = await requestWithMobileAuthRefresh(
        { accessToken, clearSession, refreshToken, setTokens },
        async (api) => api.reqAccountDownloadData()
      );
      const baseDirectory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
      if (baseDirectory === null) {
        throw new Error('No writable mobile file-system directory');
      }
      const filename = `podverse-data-export-${new Date().toISOString().split('T')[0]}.zip`;
      const fileUri = `${baseDirectory}${filename}`;
      const base64 = await blobToBase64(blob);
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      if (!isMobileE2eFromEnv()) {
        await Share.share({ title: filename, url: fileUri });
      }
      setNoticeKey('settings.account.download_my_data_success');
    } catch {
      setErrorKey('settings.account.download_my_data_error');
      setNoticeKey(null);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleExportOpml = async () => {
    setIsExporting(true);
    setErrorKey(null);
    setNoticeKey('settings.opml.export_loading');

    try {
      const opmlText = await requestWithMobileAuthRefresh(
        { accessToken, clearSession, refreshToken, setTokens },
        async (api) => {
          const result = await api.reqAccountOpmlExport({ responseType: 'text' });
          if (typeof result !== 'string') {
            throw new Error('Invalid OPML export response type');
          }
          return result;
        }
      );
      const baseDirectory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
      if (baseDirectory === null) {
        throw new Error('No writable mobile file-system directory');
      }
      const filename = `podverse-opml-export-${new Date().toISOString().split('T')[0]}.opml`;
      const fileUri = `${baseDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, opmlText);
      if (!isMobileE2eFromEnv()) {
        await Share.share({ title: filename, url: fileUri });
      }
      setNoticeKey('settings.opml.export_success');
    } catch {
      setErrorKey('settings.opml.export_error');
      setNoticeKey(null);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setErrorKey(null);
    try {
      await requestWithMobileAuthRefresh(
        { accessToken, clearSession, refreshToken, setTokens },
        async (api) => api.reqAccountDelete()
      );
      setAccount(null);
      await logout();
    } catch {
      setErrorKey('account_access.delete_error');
      setIsDeleting(false);
      setDeleteConfirmVisible(false);
    }
  };

  return (
    <View>
      <Text style={styles.title}>{t('account_access.title')}</Text>
      <Text style={styles.message}>{t('account_access.message')}</Text>

      <View style={styles.primaryActions}>
        <Button
          label={t('account_access.review_terms')}
          onPress={onReviewTerms}
          testID="account-access-review-terms"
        />
        <Button
          label={t('account_access.sign_out')}
          onPress={() => {
            void logout();
          }}
          testID="account-access-sign-out"
          variant="secondary"
        />
      </View>

      {noticeKey !== null ? <Text style={styles.notice}>{t(noticeKey)}</Text> : null}
      {errorKey !== null ? <Text style={styles.error}>{t(errorKey)}</Text> : null}

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>{t('account_access.membership_heading')}</Text>
        {membershipFailed ? (
          <Text style={styles.error}>{t('settings.membership.load_failed')}</Text>
        ) : null}
        {status !== null ? (
          <>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>{t('settings.membership.tier')}</Text>
              <Text style={styles.fieldValue}>{tierLabel}</Text>
            </View>
            {expiresOn !== null ? (
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>{t('settings.membership.expires_on')}</Text>
                <Text style={styles.fieldValue}>{expiresOn}</Text>
              </View>
            ) : null}
          </>
        ) : null}
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>{t('account_access.download_heading')}</Text>
        <Text style={styles.description}>{t('account_access.download_description')}</Text>
        <Button
          disabled={isDownloading}
          label={t('account_access.download_button')}
          loading={isDownloading}
          onPress={() => {
            void handleDownload();
          }}
          testID="account-access-download"
        />
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>{t('account_access.opml_heading')}</Text>
        <Text style={styles.description}>{t('account_access.opml_description')}</Text>
        <Button
          disabled={isExporting}
          label={t('account_access.opml_button')}
          loading={isExporting}
          onPress={() => {
            void handleExportOpml();
          }}
          testID="account-access-opml"
        />
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>{t('account_access.delete_heading')}</Text>
        <Text style={styles.description}>{t('account_access.delete_description')}</Text>
        <Button
          disabled={isDeleting || account === null}
          label={t('account_access.delete_button')}
          onPress={() => setDeleteConfirmVisible(true)}
          testID="account-access-delete"
          variant="danger"
        />
      </Card>

      <ConfirmDialog
        body={t('settings.account.delete_account_description')}
        cancelLabel={t('misc.cancel')}
        cancelTestID="account-access-delete-cancel"
        confirmLabel={t('account_access.delete_button')}
        confirmTestID="account-access-delete-confirm"
        onCancel={() => setDeleteConfirmVisible(false)}
        onConfirm={() => {
          void handleDelete();
        }}
        testID="account-access-delete-dialog"
        title={t('account_access.delete_heading')}
        visible={deleteConfirmVisible}
      />
    </View>
  );
}
