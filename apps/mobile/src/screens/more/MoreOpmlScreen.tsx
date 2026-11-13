import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { OpmlImportStatusResponse } from '@podverse/helpers-requests';

import { useAuth } from '../../auth/AuthProvider';
import { FormActions } from '../../components/form';
import { AppOverlay, OverlayPanel, OverlayScrim } from '../../components/overlay';
import { Button, Card } from '../../components/primitives';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import { ListEmpty } from '../../components/state/ListEmpty';
import { useOpmlExport } from '../../hooks/useOpmlExport';
import { useOpmlImport } from '../../hooks/useOpmlImport';
import { stopPropagation } from '../../lib/gesture/stopPropagation';
import { OFFLINE_UNAVAILABLE_MESSAGE_KEY } from '../../lib/offlineModeViews';
import { useOfflineMode } from '../../prefs/offlineMode';
import { formActionsTopGap, settingsCardGap, settingsCardInnerGap } from '../../theme/screenLayout';
import { typography } from '../../theme/typography';
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
  const { status } = useAuth();
  const { enabled: offlineModeEnabled } = useOfflineMode();
  const opmlExport = useOpmlExport();
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
          flex: 1,
          justifyContent: 'flex-end',
        },
        scrim: {
          ...StyleSheet.absoluteFill,
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
        },
        cardBody: {
          gap: settingsCardInnerGap(tokens.spacing),
        },
        cardStack: {
          gap: settingsCardGap(tokens.spacing),
        },
        description: {
          ...typography.body,
          color: themeStyles.textSecondary.color,
        },
        feedTitle: {
          ...typography.body,
          color: themeStyles.textPrimary.color,
          flex: 1,
          fontWeight: '400',
        },
        feedUrl: {
          ...typography.body,
          color: themeStyles.textSecondary.color,
        },
        outcome: {
          ...typography.body,
          color: themeStyles.textSecondary.color,
          fontWeight: '600',
        },
        resultError: {
          ...typography.body,
          color: themeStyles.textSecondary.color,
        },
        resultRow: {
          borderTopColor: themeStyles.border.borderColor,
          borderTopWidth: StyleSheet.hairlineWidth,
          gap: tokens.spacing.xs,
          paddingVertical: tokens.spacing.sm,
        },
        sectionTitle: {
          color: themeStyles.textPrimary.color,
          fontSize: 18,
          fontWeight: '700',
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
          marginTop: formActionsTopGap(tokens.spacing),
        },
        sheetMessage: {
          ...typography.prose,
          color: themeStyles.textPrimary.color,
          marginTop: tokens.spacing.sm,
        },
        sheetTitle: {
          color: themeStyles.textPrimary.color,
          fontSize: 18,
          fontWeight: '700',
        },
        statusText: {
          ...typography.body,
          color: themeStyles.textSecondary.color,
        },
        summary: {
          ...typography.body,
          color: themeStyles.textPrimary.color,
        },
      }),
    [themeStyles, tokens]
  );

  const processedCount = importReport?.results.length ?? 0;
  const totalCount = importReport?.totals.total ?? 0;
  const showResults =
    importReport !== null &&
    (importReport.status === 'completed' ||
      importReport.status === 'failed' ||
      importReport.results.length > 0);

  return (
    <MobileScreenContainer testID="more-opml-screen">
      <View style={styles.cardStack}>
        <Card style={styles.cardBody}>
          <Text style={styles.sectionTitle}>{t('settings.opml.export_title')}</Text>
          <Text style={styles.description}>
            {opmlExport.source === 'account'
              ? t('settings.opml.export_description')
              : t('settings.opml.export_description_device')}
          </Text>
          <Button
            disabled={opmlExport.source === 'unavailable' || opmlExport.isExporting}
            fullWidth
            label={t('settings.opml.export_button')}
            loading={opmlExport.isExporting}
            onPress={() => {
              void opmlExport.exportOpml();
            }}
            size="form"
            testID="opml-export-button"
          />
          {opmlExport.notice !== null ? (
            <Text
              accessibilityLiveRegion="polite"
              style={styles.statusText}
              testID="opml-export-notice"
            >
              {t(opmlExport.notice.key, opmlExport.notice.params)}
            </Text>
          ) : null}
          {opmlExport.errorKey !== null ? (
            <Text
              accessibilityLiveRegion="polite"
              style={styles.statusText}
              testID="opml-export-error"
            >
              {t(opmlExport.errorKey)}
            </Text>
          ) : null}
        </Card>

        <Card style={styles.cardBody}>
          <Text style={styles.sectionTitle}>{t('settings.opml.import_title')}</Text>
          {offlineModeEnabled ? (
            <ListEmpty
              messageKey={OFFLINE_UNAVAILABLE_MESSAGE_KEY}
              testID="opml-import-offline-unavailable"
            />
          ) : (
            <>
              <Text style={styles.description}>{t('settings.opml.import_description')}</Text>
              <Button
                disabled={status !== 'authenticated' || isImporting}
                fullWidth
                label={t('settings.opml.import_button')}
                loading={isImporting}
                onPress={() => {
                  void startImport();
                }}
                size="form"
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
                <View testID="opml-import-results">
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
            </>
          )}
        </Card>
      </View>

      <AppOverlay
        animation="slide"
        onRequestClose={closeRateLimitModal}
        visible={rateLimitMessage !== null}
      >
        <Pressable
          accessibilityLabel={t('misc.close')}
          onPress={closeRateLimitModal}
          style={styles.backdrop}
          testID="opml-rate-limit-backdrop"
        >
          <OverlayScrim pointerEvents="none" style={styles.scrim} />
          <OverlayPanel>
            <Pressable
              onPress={stopPropagation}
              style={styles.sheet}
              testID="opml-rate-limit-modal"
            >
              <Text style={styles.sheetTitle}>{t('settings.opml.import_rate_limited_title')}</Text>
              {rateLimitMessage !== null ? (
                <Text style={styles.sheetMessage}>{rateLimitMessage}</Text>
              ) : null}
              <FormActions
                actions={[
                  {
                    label: t('misc.close'),
                    onPress: closeRateLimitModal,
                    testID: 'opml-rate-limit-close',
                    variant: 'secondary',
                  },
                ]}
                style={styles.sheetActions}
              />
            </Pressable>
          </OverlayPanel>
        </Pressable>
      </AppOverlay>
    </MobileScreenContainer>
  );
}
