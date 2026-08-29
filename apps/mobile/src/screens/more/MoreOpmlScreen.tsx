import * as FileSystem from 'expo-file-system';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import type { OpmlImportStatusResponse } from '@podverse/helpers-requests';

import { requestWithMobileAuthRefresh } from '../../auth';
import { useAuth } from '../../auth/AuthProvider';
import { Button, Card } from '../../components/primitives';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import { isMobileE2eFromEnv } from '../../config/env';
import { useOpmlImport } from '../../hooks/useOpmlImport';
import { stopPropagation } from '../../lib/gesture/stopPropagation';
import { useTheme } from '../../theme/useTheme';

type OpmlImportOutcome = OpmlImportStatusResponse['results'][number]['outcome'];

const outcomeI18nKey = (outcome: OpmlImportOutcome): string => {
  if (outcome === 'enqueued_indexed') {
    return 'settings.opml.outcome_enqueued';
  }
  if (outcome === 'added_by_rss') {
    return 'settings.opml.outcome_added_by_rss';
  }
  if (outcome === 'already_subscribed') {
    return 'settings.opml.outcome_already_subscribed';
  }
  if (outcome === 'rate_limited') {
    return 'settings.opml.outcome_rate_limited';
  }
  if (outcome === 'failed') {
    return 'settings.opml.outcome_failed';
  }
  return 'settings.opml.outcome_subscribed';
};

export function MoreOpmlScreen() {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [noticeKey, setNoticeKey] = useState<string | null>(null);
  const {
    closeRateLimitModal,
    importErrorKey,
    importErrorMessage,
    importNoticeKey,
    importReport,
    isImporting,
    rateLimitMessage,
    startImport,
  } = useOpmlImport();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        backdrop: {
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
          flex: 1,
          justifyContent: 'flex-end',
        },
        cardSpacing: {
          marginTop: tokens.spacing.md,
        },
        description: {
          color: themeStyles.textSecondary.color,
          fontSize: 14,
          marginBottom: tokens.spacing.md,
        },
        feedTitle: {
          color: themeStyles.textPrimary.color,
          flex: 1,
          fontSize: 14,
          fontWeight: '600',
        },
        feedUrl: {
          color: themeStyles.textSecondary.color,
          fontSize: 12,
          marginTop: 2,
        },
        outcome: {
          color: themeStyles.textSecondary.color,
          fontSize: 12,
          fontWeight: '600',
          marginBottom: 2,
        },
        resultError: {
          color: themeStyles.textSecondary.color,
          fontSize: 12,
          marginTop: 2,
        },
        resultRow: {
          borderTopColor: themeStyles.border.borderColor,
          borderTopWidth: StyleSheet.hairlineWidth,
          paddingVertical: tokens.spacing.sm,
        },
        resultsList: {
          marginTop: tokens.spacing.sm,
        },
        sectionTitle: {
          color: themeStyles.textPrimary.color,
          fontSize: 18,
          fontWeight: '700',
          marginBottom: tokens.spacing.xs,
        },
        sheet: {
          backgroundColor: themeStyles.screen.backgroundColor,
          borderTopLeftRadius: tokens.radii.md,
          borderTopRightRadius: tokens.radii.md,
          paddingBottom: tokens.spacing['2xl'],
          paddingHorizontal: tokens.spacing.lg,
          paddingTop: tokens.spacing.lg,
        },
        sheetActions: {
          marginTop: tokens.spacing.md,
        },
        sheetMessage: {
          color: themeStyles.textPrimary.color,
          fontSize: 15,
          marginTop: tokens.spacing.sm,
        },
        sheetTitle: {
          color: themeStyles.textPrimary.color,
          fontSize: 18,
          fontWeight: '700',
        },
        statusText: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          marginTop: tokens.spacing.sm,
        },
        summary: {
          color: themeStyles.textPrimary.color,
          fontSize: 14,
          marginTop: tokens.spacing.sm,
        },
      }),
    [themeStyles, tokens]
  );

  const handleExport = async () => {
    if (status !== 'authenticated') {
      setErrorKey('authentication.login_required');
      setNoticeKey(null);
      return;
    }

    setIsExporting(true);
    setErrorKey(null);
    setNoticeKey('settings.opml.export_loading');

    try {
      const opmlText = await requestWithMobileAuthRefresh(
        {
          accessToken,
          clearSession,
          refreshToken,
          setTokens,
        },
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

  const processedCount = importReport?.results.length ?? 0;
  const totalCount = importReport?.totals.total ?? 0;
  const showResults =
    importReport !== null &&
    (importReport.status === 'completed' ||
      importReport.status === 'failed' ||
      importReport.results.length > 0);

  return (
    <MobileScreenContainer testID="more-opml-screen">
      <Card>
        <Text style={styles.sectionTitle}>{t('settings.opml.export_title')}</Text>
        <Text style={styles.description}>{t('settings.opml.export_description')}</Text>
        <Button
          disabled={status !== 'authenticated' || isExporting}
          label={t('settings.opml.export_button')}
          loading={isExporting}
          onPress={() => {
            void handleExport();
          }}
          testID="opml-export-button"
        />
        {noticeKey !== null ? (
          <Text style={styles.statusText} testID="opml-export-notice">
            {t(noticeKey)}
          </Text>
        ) : null}
        {errorKey !== null ? (
          <Text style={styles.statusText} testID="opml-export-error">
            {t(errorKey)}
          </Text>
        ) : null}
      </Card>

      <View style={styles.cardSpacing}>
        <Card>
          <Text style={styles.sectionTitle}>{t('settings.opml.import_title')}</Text>
          <Text style={styles.description}>{t('settings.opml.import_description')}</Text>
          <Button
            disabled={status !== 'authenticated' || isImporting}
            label={t('settings.opml.import_button')}
            loading={isImporting}
            onPress={() => {
              void startImport();
            }}
            testID="opml-import-button"
            variant="secondary"
          />
          {isImporting && totalCount > 0 ? (
            <Text style={styles.statusText} testID="opml-import-progress">
              {t('settings.opml.import_in_progress', {
                processed: processedCount,
                total: totalCount,
              })}
            </Text>
          ) : null}
          {importNoticeKey !== null ? (
            <Text style={styles.statusText} testID="opml-import-notice">
              {t(importNoticeKey)}
            </Text>
          ) : null}
          {importErrorKey !== null ? (
            <Text style={styles.statusText} testID="opml-import-error">
              {t(importErrorKey)}
            </Text>
          ) : importErrorMessage !== null ? (
            <Text style={styles.statusText} testID="opml-import-error">
              {importErrorMessage}
            </Text>
          ) : null}
          {showResults && importReport !== null ? (
            <View style={styles.resultsList} testID="opml-import-results">
              <Text style={styles.summary}>
                {t('settings.opml.import_result_summary', {
                  total: importReport.totals.total,
                  subscribed: importReport.totals.subscribed,
                  enqueued: importReport.totals.enqueuedIndexed,
                  addedByRss: importReport.totals.addedByRss,
                  alreadySubscribed: importReport.totals.skippedExisting,
                  failed: importReport.totals.failed,
                  rateLimited: importReport.totals.rateLimited,
                })}
              </Text>
              {importReport.results.map((result) => {
                const title =
                  result.title !== undefined && result.title.trim() !== ''
                    ? result.title
                    : result.feedUrl;
                const showUrl = result.title !== undefined && result.title.trim() !== '';
                return (
                  <View
                    key={`${result.feedUrl}-${result.outcome}`}
                    style={styles.resultRow}
                    testID={`opml-import-result-${result.outcome}`}
                  >
                    <Text style={styles.outcome}>{t(outcomeI18nKey(result.outcome))}</Text>
                    <Text style={styles.feedTitle}>{title}</Text>
                    {showUrl ? <Text style={styles.feedUrl}>{result.feedUrl}</Text> : null}
                    {result.error !== undefined && result.error !== '' ? (
                      <Text style={styles.resultError}>{result.error}</Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : null}
        </Card>
      </View>

      <Modal
        animationType="slide"
        onRequestClose={closeRateLimitModal}
        transparent
        visible={rateLimitMessage !== null}
      >
        <Pressable
          accessibilityLabel={t('misc.close')}
          onPress={closeRateLimitModal}
          style={styles.backdrop}
          testID="opml-rate-limit-backdrop"
        >
          <Pressable onPress={stopPropagation} style={styles.sheet} testID="opml-rate-limit-modal">
            <Text style={styles.sheetTitle}>{t('settings.opml.import_rate_limited_title')}</Text>
            {rateLimitMessage !== null ? (
              <Text style={styles.sheetMessage}>{rateLimitMessage}</Text>
            ) : null}
            <View style={styles.sheetActions}>
              <Button
                label={t('misc.close')}
                onPress={closeRateLimitModal}
                testID="opml-rate-limit-close"
                variant="secondary"
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </MobileScreenContainer>
  );
}
