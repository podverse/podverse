import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { BadgeTone } from '../../components/primitives';
import type { SyncEventLogEntry } from '../../data/repositories';
import { DIRECTORY_CHANNEL_GONE_CODE } from '../../data/repositories';
import {
  ADD_BY_RSS_ADD_LOG_KIND,
  getSyncLogLabelKey,
  PLAYBACK_LOG_KIND,
} from '../../sync/syncJobKinds';

/** Shared copy and formatting for the error log list and detail screens. */

type Translate = (key: string, values?: Record<string, string | number>) => string;

export const ERROR_LOG_OUTCOME_LABEL_KEYS: Record<SyncEventLogEntry['outcome'], string> = {
  failure: 'error_log.outcome_failure',
  reconciled: 'error_log.outcome_reconciled',
  skipped: 'error_log.outcome_skipped',
  success: 'error_log.outcome_success',
};

export const ERROR_LOG_OUTCOME_BADGE_TONES: Record<SyncEventLogEntry['outcome'], BadgeTone> = {
  failure: 'danger',
  reconciled: 'muted',
  skipped: 'muted',
  success: 'muted',
};

export const errorLogCategoryLabel = (t: Translate, jobKind: string): string => {
  const labelKey = getSyncLogLabelKey(jobKind);
  return labelKey === null ? jobKind : t(labelKey);
};

export const errorLogMessage = (t: Translate, entry: SyncEventLogEntry): string | null => {
  if (entry.errorCode === DIRECTORY_CHANNEL_GONE_CODE && entry.message !== null) {
    return t('error_log.directory_channel_gone', { channel: entry.message });
  }
  return entry.message;
};

/** What the entry was about, for the one-line list row: a title, else the feed or media address. */
export const errorLogSubject = (entry: SyncEventLogEntry): string | null => {
  const { details } = entry;
  return (
    details.item_title ?? details.channel_title ?? details.feed_url ?? details.media_url ?? null
  );
};

/**
 * Entries about media or feeds the creator hosts. The detail screen explains that the fault may be
 * on their server, which is the point of recording these at all.
 */
export const isCreatorHostedEntry = (entry: SyncEventLogEntry): boolean => {
  return (
    entry.jobKind === PLAYBACK_LOG_KIND ||
    entry.jobKind === ADD_BY_RSS_ADD_LOG_KIND ||
    entry.jobKind === 'add-by-rss-parse'
  );
};

/**
 * Absolute rather than relative: "2 days ago" is fine for a notification and useless in a report
 * somebody reads a week later. Component options rather than `dateStyle`/`timeStyle`, which are
 * the parts of ECMA-402 that Hermes has been least consistent about across platforms.
 */
export const useErrorLogTimestampFormatter = (): Intl.DateTimeFormat => {
  const { i18n } = useTranslation();
  return useMemo(() => {
    return new Intl.DateTimeFormat(i18n.language, {
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      month: '2-digit',
      second: '2-digit',
      year: 'numeric',
    });
  }, [i18n.language]);
};
