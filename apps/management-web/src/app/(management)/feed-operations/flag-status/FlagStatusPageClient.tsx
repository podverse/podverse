'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { Alert } from '../../../../components/ui/Alert/Alert';
import { Button } from '../../../../components/ui/Button/Button';
import { Card } from '../../../../components/ui/Card/Card';
import { FormGroup, FormInput, FormLabel } from '../../../../components/ui/Form';
import {
  canUpdateFeeds,
  FEED_FLAG_TAKEDOWN_ID,
  statusRequiresConfirm,
} from '../../../../lib/managementPermissions';
import type { CurrentUser } from '../../../../lib/requests/auth';
import {
  applyFeedFlagStatus,
  type FeedFlagLookup,
  type FeedOptionsResponse,
  getFeedOperationOptions,
  lookupFeed,
} from '../../../../lib/requests/feedFlagStatus';

import styles from './page.module.scss';

type FlagStatusPageClientProps = {
  user: CurrentUser;
};

type SearchMode = 'podcast_index_id' | 'feed_id' | 'url';

export function FlagStatusPageClient({ user }: FlagStatusPageClientProps) {
  const canUpdate = canUpdateFeeds(user);
  const [options, setOptions] = useState<FeedOptionsResponse | null>(null);
  const [searchMode, setSearchMode] = useState<SearchMode>('podcast_index_id');
  const [searchText, setSearchText] = useState('');
  const [feed, setFeed] = useState<FeedFlagLookup | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [statusId, setStatusId] = useState<string>('');
  const [reasonId, setReasonId] = useState<string>('');
  const [note, setNote] = useState('');
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyMessage, setApplyMessage] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    let c = false;
    const run = async () => {
      try {
        const o = await getFeedOperationOptions();
        if (!c) {
          setOptions(o);
        }
      } catch {
        if (!c) {
          setOptionsError('Could not load status and reason options.');
        }
      } finally {
        if (!c) {
          setOptionsLoading(false);
        }
      }
    };
    void run();
    return () => {
      c = true;
    };
  }, []);

  const performLookup = useCallback(async () => {
    setLoadError(null);
    setApplyMessage(null);
    setApplyError(null);
    setFeed(null);
    setLookupLoading(true);
    try {
      if (searchMode === 'url') {
        if (!searchText.trim()) {
          setLoadError('Enter a feed URL');
          return;
        }
        const { feed: f } = await lookupFeed({ url: searchText.trim() });
        setFeed(f);
        setStatusId(String(f.feed_flag_status_id));
        setReasonId(
          f.feed_flag_status_reason_id !== null && f.feed_flag_status_reason_id !== undefined
            ? String(f.feed_flag_status_reason_id)
            : ''
        );
        setNote(f.feed_flag_status_reason_note ?? '');
        return;
      }
      const n = parseInt(searchText.trim(), 10);
      if (Number.isNaN(n) || n <= 0) {
        setLoadError('Enter a positive number');
        return;
      }
      if (searchMode === 'podcast_index_id') {
        const { feed: f } = await lookupFeed({ podcast_index_id: n });
        setFeed(f);
        setStatusId(String(f.feed_flag_status_id));
        setReasonId(
          f.feed_flag_status_reason_id !== null && f.feed_flag_status_reason_id !== undefined
            ? String(f.feed_flag_status_reason_id)
            : ''
        );
        setNote(f.feed_flag_status_reason_note ?? '');
        return;
      }
      const { feed: f } = await lookupFeed({ feed_id: n });
      setFeed(f);
      setStatusId(String(f.feed_flag_status_id));
      setReasonId(
        f.feed_flag_status_reason_id !== null && f.feed_flag_status_reason_id !== undefined
          ? String(f.feed_flag_status_reason_id)
          : ''
      );
      setNote(f.feed_flag_status_reason_note ?? '');
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setLoadError(
        message === 'Feed not found' || message
          ? String(message)
          : 'Feed not found or request failed'
      );
    } finally {
      setLookupLoading(false);
    }
  }, [searchMode, searchText]);

  const runApply = useCallback(async () => {
    if (!feed || !canUpdate) {
      return;
    }
    const st = parseInt(statusId, 10);
    if (Number.isNaN(st)) {
      setApplyError('Select a new status');
      return;
    }
    if (st === FEED_FLAG_TAKEDOWN_ID && !reasonId) {
      setApplyError('A predefined reason is required for takedown');
      return;
    }
    let rId: number | null;
    if (reasonId === '') {
      rId = null;
    } else {
      const parsed = parseInt(reasonId, 10);
      if (Number.isNaN(parsed)) {
        setApplyError('Invalid reason');
        return;
      }
      rId = parsed;
    }
    setApplyLoading(true);
    setApplyError(null);
    setApplyMessage(null);
    try {
      const noteTrim = note.trim();
      await applyFeedFlagStatus({
        feed_id: feed.id,
        feed_flag_status_id: st,
        feed_flag_status_reason_id: rId,
        feed_flag_status_reason_note: noteTrim.length > 0 ? noteTrim : null,
      });
      setApplyMessage('Feed status was updated');
      setConfirmOpen(false);
      setFeed((prev) =>
        prev
          ? {
              ...prev,
              feed_flag_status_id: st,
              feed_flag_status_key:
                options?.feed_flag_statuses.find((s) => s.id === st)?.status ?? String(st),
              feed_flag_status_reason_id: rId,
              feed_flag_status_reason_key: rId
                ? (options?.feed_flag_status_reasons.find((r) => r.id === rId)?.reason ?? null)
                : null,
              feed_flag_status_reason_note: noteTrim.length > 0 ? noteTrim : null,
            }
          : null
      );
    } catch (e) {
      const message =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setApplyError(message ? String(message) : 'Request failed. Check permissions and try again');
    } finally {
      setApplyLoading(false);
    }
  }, [feed, canUpdate, statusId, reasonId, note, options]);

  const handleClickApply = useCallback(() => {
    if (!feed || !canUpdate) {
      return;
    }
    const st = parseInt(statusId, 10);
    if (Number.isNaN(st)) {
      setApplyError('Select a new status');
      return;
    }
    if (st === FEED_FLAG_TAKEDOWN_ID && !reasonId) {
      setApplyError('A predefined reason is required for takedown');
      return;
    }
    if (statusRequiresConfirm(st)) {
      setConfirmOpen(true);
    } else {
      void runApply();
    }
  }, [feed, canUpdate, statusId, reasonId, runApply]);

  if (optionsLoading) {
    return (
      <div className="container">
        <p>Loading&hellip;</p>
      </div>
    );
  }

  return (
    <div className="container">
      <header className={styles.header}>
        <h1 className="page-title">Set feed status</h1>
        <p className="page-subtitle">
          Find a feed by Podcast Index ID (default), internal feed id, or URL. Set moderation
          status, optional reason, and note. This is separate from the database table browser.
        </p>
        <p className={styles.bread}>
          <Link href="/feed-operations/flag-status" className={styles.breadLink}>
            Feed operations
          </Link>
          <span aria-hidden> / </span>
          <span>Flag status</span>
        </p>
      </header>

      {optionsError && <Alert variant="error">{optionsError}</Alert>}

      <section className={styles.section} aria-label="Search">
        <Card>
          <h2 className={styles.h2}>Find a feed</h2>
          <div className={styles.lookupGrid}>
            <FormLabel htmlFor="feed-flag-lookup-mode">Search by</FormLabel>
            <FormLabel htmlFor="feed-flag-lookup-value">
              {searchMode === 'url' ? 'URL' : 'Value'}
            </FormLabel>
            <div className={styles.lookupActionLabel} aria-hidden>
              {'\u00A0'}
            </div>
            <select
              id="feed-flag-lookup-mode"
              className={`${styles.select} ${styles.inlineControl}`}
              value={searchMode}
              onChange={(e) => setSearchMode(e.target.value as SearchMode)}
            >
              <option value="podcast_index_id">Podcast Index ID</option>
              <option value="feed_id">Internal feed id</option>
              <option value="url">Feed URL (exact match)</option>
            </select>
            <FormInput
              id="feed-flag-lookup-value"
              className={styles.inlineControl}
              type={searchMode === 'url' ? 'text' : 'number'}
              name="q"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder={searchMode === 'url' ? 'https://…' : 'e.g. 12345'}
              autoComplete="off"
            />
            <Button
              className={styles.inlineControlButton}
              disabled={lookupLoading}
              onClick={() => {
                void performLookup();
              }}
              type="button"
              variant="primary"
            >
              {lookupLoading ? 'Looking up…' : 'Look up'}
            </Button>
          </div>
        </Card>
        {loadError && <Alert variant="error">{loadError}</Alert>}
      </section>

      {feed && (
        <section
          className={styles.section}
          aria-label="Selected feed, current values, and status update"
        >
          <Card>
            <h2 className={styles.h2}>This feed</h2>
            <h3 className={styles.h3}>On record</h3>
            <dl className={styles.dl}>
              {feed.channel_title && (
                <>
                  <dt>Channel title</dt>
                  <dd>{feed.channel_title}</dd>
                </>
              )}
              <dt>URL</dt>
              <dd className={styles.muted}>{feed.url}</dd>
              <dt>Internal feed id</dt>
              <dd>{feed.id}</dd>
              <dt>Podcast Index ID</dt>
              <dd>{feed.podcast_index_id}</dd>
              <dt>Status</dt>
              <dd>
                {feed.feed_flag_status_key} (id: {feed.feed_flag_status_id})
              </dd>
              <dt>Reason</dt>
              <dd>{feed.feed_flag_status_reason_key ?? '—'}</dd>
              <dt>Reason note</dt>
              <dd className={styles.muted}>
                {feed.feed_flag_status_reason_note?.length
                  ? feed.feed_flag_status_reason_note
                  : '—'}
              </dd>
            </dl>
            <p className={styles.dbLink}>
              <Link className={styles.inlinelink} href={`/database/feed/${String(feed.id)}`}>
                Open this row in Database (read-only for feed)
              </Link>
            </p>

            {canUpdate && options && (
              <div className={styles.feedUpdateForm}>
                <h3 className={styles.h3}>New status and reason</h3>
                <div className={styles.formBlock}>
                  <FormGroup>
                    <FormLabel>New status *</FormLabel>
                    <select
                      className={styles.select}
                      value={statusId}
                      onChange={(e) => setStatusId(e.target.value)}
                      required
                    >
                      <option value="" disabled>
                        Select status
                      </option>
                      {options.feed_flag_statuses.map((s) => (
                        <option key={s.id} value={String(s.id)}>
                          {s.status} (id: {s.id})
                        </option>
                      ))}
                    </select>
                  </FormGroup>
                  <FormGroup>
                    <FormLabel>
                      Reason
                      {parseInt(statusId, 10) === FEED_FLAG_TAKEDOWN_ID ? ' *' : ' (optional)'}
                    </FormLabel>
                    <select
                      className={styles.select}
                      value={reasonId}
                      onChange={(e) => setReasonId(e.target.value)}
                    >
                      <option value="">(none)</option>
                      {options.feed_flag_status_reasons.map((r) => (
                        <option key={r.id} value={String(r.id)}>
                          {r.reason} (id: {r.id})
                        </option>
                      ))}
                    </select>
                  </FormGroup>
                  <FormGroup>
                    <FormLabel>Note (optional)</FormLabel>
                    <textarea
                      className={styles.textarea}
                      name="note"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={4}
                      maxLength={10000}
                      placeholder="Additional context (stored on the feed record)"
                    />
                  </FormGroup>
                  {applyError && <Alert variant="error">{applyError}</Alert>}
                  {applyMessage && <Alert variant="default">{applyMessage}</Alert>}

                  {confirmOpen && (
                    <div
                      className={styles.confirm}
                      role="dialog"
                      aria-label="Confirm status change"
                    >
                      <p>Apply this status to the feed? This is recorded in the audit log.</p>
                      <div className={styles.confirmRow}>
                        <Button
                          type="button"
                          disabled={applyLoading}
                          onClick={() => {
                            void runApply();
                          }}
                          variant="primary"
                        >
                          {applyLoading ? 'Applying…' : 'Confirm'}
                        </Button>
                        <Button
                          type="button"
                          onClick={() => {
                            setConfirmOpen(false);
                          }}
                          variant="default"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {!confirmOpen && (
                    <>
                      <Button
                        disabled={applyLoading}
                        onClick={handleClickApply}
                        type="button"
                        variant="primary"
                      >
                        {applyLoading
                          ? 'Applying…'
                          : statusRequiresConfirm(parseInt(statusId, 10) || 0)
                            ? 'Continue to confirmation'
                            : 'Apply change'}
                      </Button>
                      {statusRequiresConfirm(parseInt(statusId, 10) || 0) && (
                        <p className={styles.hintSmall}>
                          Spam and takedown use a second confirmation step.
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {!canUpdate && (
              <p className={styles.readonlyHint}>
                Your account can look up feeds but not change status. Ask a superuser for
                <code> feeds</code> update access.
              </p>
            )}
          </Card>
        </section>
      )}
    </div>
  );
}
