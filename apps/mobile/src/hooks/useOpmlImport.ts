import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { resolveOpmlImportError } from '@podverse/helpers/opml';
import type { OpmlImportStatusResponse } from '@podverse/helpers-requests';

import { requestWithMobileAuthRefresh } from '../auth';
import { useAuth } from '../auth/AuthProvider';
import { isMobileE2eFromEnv } from '../config/env';
import { buildE2eSampleOpml } from '../lib/opml/e2eSampleOpml';
import { pollOpmlImportStatus } from '../lib/opml/pollOpmlImportStatus';
import {
  buildOpmlRateLimitMessage,
  handleRateLimitMessage,
} from '../lib/rateLimit/handleRateLimitMessage';
import { useSync } from '../sync';

const pickOpmlText = async (): Promise<string | null> => {
  if (isMobileE2eFromEnv()) {
    return buildE2eSampleOpml();
  }

  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
    type: ['application/xml', 'text/xml', 'text/x-opml', '*/*'],
  });

  if (result.canceled) {
    return null;
  }

  const asset = result.assets[0];
  if (asset === undefined) {
    return null;
  }

  return FileSystem.readAsStringAsync(asset.uri);
};

export function useOpmlImport() {
  const { t } = useTranslation();
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();
  const { requestSync } = useSync();
  const [isImporting, setIsImporting] = useState(false);
  const [importReport, setImportReport] = useState<OpmlImportStatusResponse | null>(null);
  const [importErrorKey, setImportErrorKey] = useState<string | null>(null);
  const [importErrorMessage, setImportErrorMessage] = useState<string | null>(null);
  const [importNoticeKey, setImportNoticeKey] = useState<string | null>(null);
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);

  const closeRateLimitModal = useCallback(() => {
    setRateLimitMessage(null);
  }, []);

  const startImport = useCallback(async () => {
    if (status !== 'authenticated') {
      setImportErrorKey('authentication.login_required');
      setImportNoticeKey(null);
      return;
    }

    setIsImporting(true);
    setImportReport(null);
    setImportErrorKey(null);
    setImportErrorMessage(null);
    setImportNoticeKey('settings.opml.import_loading');
    setRateLimitMessage(null);

    try {
      const opml = await pickOpmlText();
      if (opml === null) {
        setImportNoticeKey(null);
        return;
      }

      const { request_id: requestId } = await requestWithMobileAuthRefresh(
        {
          accessToken,
          clearSession,
          refreshToken,
          setTokens,
        },
        async (api) => api.reqAccountOpmlImport({ opml })
      );

      const finalReport = await pollOpmlImportStatus({
        requestId,
        fetchStatus: async (id) =>
          requestWithMobileAuthRefresh(
            {
              accessToken,
              clearSession,
              refreshToken,
              setTokens,
            },
            async (api) => api.reqAccountOpmlImportStatus(id)
          ),
        onStatusUpdate: (statusResponse) => {
          setImportReport(statusResponse);
        },
      });

      if (finalReport.status === 'failed') {
        setImportErrorKey('settings.opml.import_error');
        setImportErrorMessage(null);
        setImportNoticeKey(null);
      } else {
        setImportNoticeKey('settings.opml.import_success');
        setImportErrorKey(null);
        setImportErrorMessage(null);
      }

      if (finalReport.rateLimited !== undefined) {
        setRateLimitMessage(
          buildOpmlRateLimitMessage(
            finalReport.rateLimited.limit,
            finalReport.rateLimited.retryAfterSeconds,
            t
          )
        );
      }

      // The import created follows on the server; pulling them down is reconciliation, so it goes
      // through the queue and reports to the sync indicator rather than extending this spinner by
      // however many pages the account now needs.
      requestSync('pull-to-refresh');
    } catch (error) {
      const rateLimitText = handleRateLimitMessage(error, t);
      if (rateLimitText !== null) {
        setRateLimitMessage(rateLimitText);
        setImportNoticeKey(null);
        setImportErrorKey(null);
        setImportErrorMessage(null);
      } else {
        const resolved = resolveOpmlImportError(error);
        if (resolved !== null) {
          setImportErrorMessage(t(`settings.${resolved.i18nKey}`, resolved.values));
          setImportErrorKey(null);
        } else {
          setImportErrorKey('settings.opml.import_error');
          setImportErrorMessage(null);
        }
        setImportNoticeKey(null);
      }
    } finally {
      setIsImporting(false);
    }
  }, [accessToken, clearSession, refreshToken, requestSync, setTokens, status, t]);

  return {
    closeRateLimitModal,
    importErrorKey,
    importErrorMessage,
    importNoticeKey,
    importReport,
    isImporting,
    rateLimitMessage,
    startImport,
  };
}
