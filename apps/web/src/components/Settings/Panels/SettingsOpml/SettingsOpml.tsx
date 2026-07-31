'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';
import { useRef, useState } from 'react';

import { resolveOpmlImportError } from '@podverse/helpers';
import type { OpmlImportStatusResponse } from '@podverse/helpers-requests';
import { Button, Divider } from '@podverse/ui';

import { getApiRequestService } from '../../../../factories/apiRequestService';
import { pollOpmlImportStatus } from '../../../../utils/opml/pollOpmlImportStatus';
import { handleRateLimitAlert } from '../../../../utils/rateLimit/rateLimitAlert';
import { dismissToast, showToast, showToastLoading } from '../../../Toast/Toast';
import { SettingsSection } from '../../SettingsSection';
import { ModalOpmlImportRateLimit } from './ModalOpmlImportRateLimit';

import styles from '../../../../styles/components/Settings/Panels/SettingsOpml/SettingsOpml.module.scss';

type OpmlImportOutcome = OpmlImportStatusResponse['results'][number]['outcome'];

const outcomeI18nKey = (outcome: OpmlImportOutcome): string => {
  if (outcome === 'enqueued_indexed') {
    return 'opml.outcome_enqueued';
  }
  if (outcome === 'added_by_rss') {
    return 'opml.outcome_added_by_rss';
  }
  if (outcome === 'already_subscribed') {
    return 'opml.outcome_already_subscribed';
  }
  if (outcome === 'rate_limited') {
    return 'opml.outcome_rate_limited';
  }
  if (outcome === 'failed') {
    return 'opml.outcome_failed';
  }
  return 'opml.outcome_subscribed';
};

const formatRetryAfterTime = (
  retryAfterSeconds: number,
  tSettings: (key: string, values?: Record<string, number>) => string
): string => {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return tSettings('opml.import_rate_limited_time', { minutes });
};

export function SettingsOpml() {
  const tSettings = useTranslations('settings');
  const tMisc = useTranslations('misc');
  const locale = useLocale();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importReport, setImportReport] = useState<OpmlImportStatusResponse | null>(null);
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);

  const openRateLimitModal = (message: string) => {
    setRateLimitMessage(message);
  };

  const closeRateLimitModal = () => {
    setRateLimitMessage(null);
  };

  const handleExport = async () => {
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

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    setIsImporting(true);
    setImportReport(null);
    const loadingToastId = await showToastLoading(tSettings('opml.import_loading'));

    try {
      const opml = await file.text();
      const { request_id: requestId } = await getApiRequestService().reqAccountOpmlImport({ opml });

      const finalReport = await pollOpmlImportStatus({
        requestId,
        onStatusUpdate: (statusResponse) => {
          setImportReport(statusResponse);
        },
      });

      dismissToast(loadingToastId);

      if (finalReport.status === 'failed') {
        showToast(tSettings('opml.import_error'), 'error');
      } else {
        showToast(tSettings('opml.import_success'), 'success');
      }

      if (finalReport.rateLimited) {
        openRateLimitModal(
          tSettings('opml.import_rate_limited', {
            limit: finalReport.rateLimited.limit,
            time: formatRetryAfterTime(finalReport.rateLimited.retryAfterSeconds, tSettings),
          })
        );
      }
    } catch (error) {
      dismissToast(loadingToastId);
      const rateLimitErrorHandled = await handleRateLimitAlert(error, locale, tMisc, {
        suppressAlert: true,
        onMessage: openRateLimitModal,
      });
      if (!rateLimitErrorHandled) {
        const resolved = resolveOpmlImportError(error);
        if (resolved !== null) {
          showToast(tSettings(resolved.i18nKey, resolved.values), 'error');
        } else {
          showToast(tSettings('opml.import_error'), 'error');
        }
      }
    } finally {
      setIsImporting(false);
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
    <>
      <SettingsSection>
        <h3>{tSettings('opml.import_title')}</h3>
        <input
          ref={fileInputRef}
          type="file"
          accept=".opml,.xml,text/xml,application/xml"
          onChange={handleImportFileSelected}
          className={styles.hiddenFileInput}
          data-testid="settings-opml-import-input"
          tabIndex={-1}
          aria-hidden
        />
        <Button
          type="button"
          onClick={handleImportClick}
          variant="primary"
          description={tSettings('opml.import_description')}
          isLoading={isImporting}
          disabled={isImporting}
        >
          {tSettings('opml.import_button')}
        </Button>
        {isImporting && totalCount > 0 ? (
          <p className={styles.progress} data-testid="settings-opml-import-progress">
            {tSettings('opml.import_in_progress', {
              processed: processedCount,
              total: totalCount,
            })}
          </p>
        ) : null}
        {showResults && importReport ? (
          <div className={styles.results} data-testid="settings-opml-import-results">
            <p className={styles.summary}>
              {tSettings('opml.import_result_summary', {
                total: importReport.totals.total,
                subscribed: importReport.totals.subscribed,
                enqueued: importReport.totals.enqueuedIndexed,
                addedByRss: importReport.totals.addedByRss,
                alreadySubscribed: importReport.totals.skippedExisting,
                failed: importReport.totals.failed,
                rateLimited: importReport.totals.rateLimited,
              })}
            </p>
            {importReport.results.length > 0 ? (
              <ul className={styles.resultsList}>
                {importReport.results.map((result) => (
                  <li key={`${result.feedUrl}-${result.outcome}`} className={styles.resultRow}>
                    <span className={styles.outcome}>
                      {tSettings(outcomeI18nKey(result.outcome))}
                    </span>
                    <span className={styles.feedTitle}>
                      {result.title && result.title.trim() !== '' ? result.title : result.feedUrl}
                    </span>
                    {result.title && result.title.trim() !== '' ? (
                      <span className={styles.feedUrl}>{result.feedUrl}</span>
                    ) : null}
                    {result.error ? <span className={styles.error}>{result.error}</span> : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </SettingsSection>

      <Divider withSpacing />

      <SettingsSection>
        <h3>{tSettings('opml.export_title')}</h3>
        <Button
          type="button"
          onClick={handleExport}
          variant="primary"
          description={tSettings('opml.export_description')}
          isLoading={isExporting}
          disabled={isExporting}
        >
          {tSettings('opml.export_button')}
        </Button>
      </SettingsSection>

      <ModalOpmlImportRateLimit
        isOpen={rateLimitMessage !== null}
        message={rateLimitMessage}
        onClose={closeRateLimitModal}
      />
    </>
  );
}
