import * as FileSystem from 'expo-file-system/legacy';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Share } from 'react-native';

import { requestWithMobileAuthRefresh } from '../auth';
import type { AuthStatus } from '../auth/AuthProvider';
import { useAuth } from '../auth/AuthProvider';
import { isMobileE2eFromEnv } from '../config/env';
import { addByRssRepository, subscriptionsRepository } from '../data/repositories';
import type { DirectoryFeedUrlLookupResult } from '../lib/opml/directoryFeedUrlLookup';
import { lookupDirectoryFeedUrls, sleepUnlessAborted } from '../lib/opml/directoryFeedUrlLookup';
import { buildDeviceOpmlExport, opmlExportFilename } from '../lib/opml/opmlExportFile';
import { presentShareSheet } from '../lib/share/shareSheetPassthrough';
import { isOfflineModeEnabled } from '../prefs/offlineMode';

/**
 * Where Export OPML gets its file: the account's server export signed in, the feeds on this
 * device signed out, and nothing while the session is still resolving.
 */
export type OpmlExportSource = 'account' | 'device' | 'unavailable';

/** A catalog key and the numbers it interpolates. */
export type OpmlExportMessage = { key: string; params?: Record<string, number> };

export type UseOpmlExportResult = {
  clearStatus: () => void;
  errorKey: string | null;
  exportOpml: () => Promise<void>;
  isExporting: boolean;
  notice: OpmlExportMessage | null;
  source: OpmlExportSource;
};

type DeviceExportOutcome =
  | { kind: 'aborted' }
  | { kind: 'empty' }
  | { errorKey: string; kind: 'nothing_found' }
  | { kind: 'file'; notice: OpmlExportMessage; text: string };

const sourceForStatus = (status: AuthStatus): OpmlExportSource => {
  switch (status) {
    case 'authenticated':
      return 'account';
    case 'anonymous':
      return 'device';
    case 'unknown':
      return 'unavailable';
  }
};

const deviceExportNotice = (missingCount: number): OpmlExportMessage => {
  if (missingCount === 0) {
    return { key: 'settings.opml.export_success' };
  }
  if (isOfflineModeEnabled()) {
    return { key: 'settings.opml.export_device_offline_mode', params: { count: missingCount } };
  }
  return { key: 'settings.opml.export_device_partial', params: { count: missingCount } };
};

/**
 * Build the signed-out export from the device: followed Add by RSS feeds as stored, plus each
 * directory follow whose feed URL the public channel route returns. Offline Mode makes no lookups.
 */
const buildDeviceExport = async (
  signal: AbortSignal,
  onProgress: (done: number, total: number) => void
): Promise<DeviceExportOutcome> => {
  const [addByRssRows, directoryEntries] = await Promise.all([
    addByRssRepository.listSignedOutFollowedFeeds(),
    subscriptionsRepository.listDirectoryForExport(),
  ]);
  if (signal.aborted) {
    return { kind: 'aborted' };
  }
  const addByRssFeeds = addByRssRows.map((row) => ({ feedUrl: row.feedUrl, title: row.title }));
  if (addByRssFeeds.length === 0 && directoryEntries.length === 0) {
    return { kind: 'empty' };
  }

  let lookupResult: DirectoryFeedUrlLookupResult;
  if (directoryEntries.length === 0) {
    lookupResult = { found: [], missingCount: 0 };
  } else if (isOfflineModeEnabled()) {
    lookupResult = { found: [], missingCount: directoryEntries.length };
  } else {
    const result = await lookupDirectoryFeedUrls({
      entries: directoryEntries,
      lookup: subscriptionsRepository.fetchDirectoryFeedUrl,
      now: Date.now,
      onProgress,
      signal,
      sleep: sleepUnlessAborted,
    });
    if (result === null) {
      return { kind: 'aborted' };
    }
    lookupResult = result;
  }

  const text = buildDeviceOpmlExport({ addByRssFeeds, directoryFeeds: lookupResult.found });
  if (text === null) {
    return {
      errorKey: isOfflineModeEnabled()
        ? 'settings.opml.export_device_offline_mode_unavailable'
        : 'settings.opml.export_device_lookup_failed',
      kind: 'nothing_found',
    };
  }
  return { kind: 'file', notice: deviceExportNotice(lookupResult.missingCount), text };
};

/** Write the export to the cache directory and open the share sheet. False when aborted. */
const writeAndShareOpml = async (text: string, signal: AbortSignal): Promise<boolean> => {
  const baseDirectory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (baseDirectory === null) {
    throw new Error('No writable mobile file-system directory');
  }
  if (signal.aborted) {
    return false;
  }
  const filename = opmlExportFilename(new Date());
  const fileUri = `${baseDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(fileUri, text);
  if (signal.aborted) {
    return false;
  }
  if (!isMobileE2eFromEnv()) {
    await presentShareSheet(() => Share.share({ title: filename, url: fileUri }));
  }
  return !signal.aborted;
};

/**
 * Every Export OPML control. Signed in, it shares the account's server export. Signed out, it
 * builds the file on the device. Leaving the screen mid-export writes no file and opens no share
 * sheet.
 */
export const useOpmlExport = (): UseOpmlExportResult => {
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();
  const source = sourceForStatus(status);
  const [isExporting, setIsExporting] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<OpmlExportMessage | null>(null);
  const runningRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    []
  );

  const clearStatus = useCallback(() => {
    setNotice(null);
    setErrorKey(null);
  }, []);

  const exportOpml = useCallback(async () => {
    if (source === 'unavailable' || runningRef.current) {
      return;
    }
    runningRef.current = true;
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    setIsExporting(true);
    setErrorKey(null);
    setNotice({ key: 'settings.opml.export_loading' });

    try {
      let text: string;
      let successNotice: OpmlExportMessage;
      if (source === 'account') {
        text = await requestWithMobileAuthRefresh(
          { accessToken, clearSession, refreshToken, setTokens },
          async (api) => {
            const result = await api.reqAccountOpmlExport({ responseType: 'text' });
            if (typeof result !== 'string') {
              throw new Error('Invalid OPML export response type');
            }
            return result;
          }
        );
        successNotice = { key: 'settings.opml.export_success' };
      } else {
        const outcome = await buildDeviceExport(signal, (done, total) => {
          if (!signal.aborted) {
            setNotice({
              key: 'settings.opml.export_device_looking_up',
              params: { done, total },
            });
          }
        });
        if (outcome.kind === 'aborted' || signal.aborted) {
          return;
        }
        if (outcome.kind === 'empty') {
          setNotice({ key: 'settings.opml.export_device_empty' });
          return;
        }
        if (outcome.kind === 'nothing_found') {
          setErrorKey(outcome.errorKey);
          setNotice(null);
          return;
        }
        text = outcome.text;
        successNotice = outcome.notice;
      }

      const shared = await writeAndShareOpml(text, signal);
      if (shared) {
        setNotice(successNotice);
      }
    } catch {
      if (!signal.aborted) {
        setErrorKey('settings.opml.export_error');
        setNotice(null);
      }
    } finally {
      runningRef.current = false;
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      if (!signal.aborted) {
        setIsExporting(false);
      }
    }
  }, [accessToken, clearSession, refreshToken, setTokens, source]);

  return { clearStatus, errorKey, exportOpml, isExporting, notice, source };
};
