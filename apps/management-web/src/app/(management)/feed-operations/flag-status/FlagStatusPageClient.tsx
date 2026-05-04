'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('feedFlagStatus');
  const tc = useTranslations('common');
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
  const [spamItemLimitOverrideInput, setSpamItemLimitOverrideInput] = useState('');
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
          setOptionsError(t('optionsLoadError'));
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
  }, [t]);

  const setFeedStateFromLookup = useCallback((nextFeed: FeedFlagLookup) => {
    setFeed(nextFeed);
    setStatusId(String(nextFeed.feed_flag_status_id));
    setReasonId(
      nextFeed.feed_flag_status_reason_id !== null &&
        nextFeed.feed_flag_status_reason_id !== undefined
        ? String(nextFeed.feed_flag_status_reason_id)
        : ''
    );
    setNote(nextFeed.feed_flag_status_reason_note ?? '');
    setSpamItemLimitOverrideInput(
      nextFeed.spam_item_limit_override !== null && nextFeed.spam_item_limit_override !== undefined
        ? String(nextFeed.spam_item_limit_override)
        : ''
    );
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
          setLoadError(t('lookupErrorEnterUrl'));
          return;
        }
        const { feed: f } = await lookupFeed({ url: searchText.trim() });
        setFeedStateFromLookup(f);
        return;
      }
      const n = parseInt(searchText.trim(), 10);
      if (Number.isNaN(n) || n <= 0) {
        setLoadError(t('lookupErrorPositiveNumber'));
        return;
      }
      if (searchMode === 'podcast_index_id') {
        const { feed: f } = await lookupFeed({ podcast_index_id: n });
        setFeedStateFromLookup(f);
        return;
      }
      const { feed: f } = await lookupFeed({ feed_id: n });
      setFeedStateFromLookup(f);
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setLoadError(
        message !== null && message !== undefined && message !== ''
          ? String(message)
          : t('lookupErrorGeneric')
      );
    } finally {
      setLookupLoading(false);
    }
  }, [searchMode, searchText, setFeedStateFromLookup, t]);

  const runApply = useCallback(async () => {
    if (!feed || !canUpdate) {
      return;
    }
    const st = parseInt(statusId, 10);
    if (Number.isNaN(st)) {
      setApplyError(t('applyErrorSelectStatus'));
      return;
    }
    if (st === FEED_FLAG_TAKEDOWN_ID && !reasonId) {
      setApplyError(t('applyErrorTakedownReason'));
      return;
    }
    let rId: number | null;
    if (reasonId === '') {
      rId = null;
    } else {
      const parsed = parseInt(reasonId, 10);
      if (Number.isNaN(parsed)) {
        setApplyError(t('applyErrorInvalidReason'));
        return;
      }
      rId = parsed;
    }
    const spamOverrideRaw = spamItemLimitOverrideInput.trim();
    let spamItemLimitOverride: number | null = null;
    if (spamOverrideRaw.length > 0) {
      const parsedSpamOverride = parseInt(spamOverrideRaw, 10);
      if (Number.isNaN(parsedSpamOverride) || parsedSpamOverride <= 0) {
        setApplyError(t('applyErrorSpamOverride'));
        return;
      }
      spamItemLimitOverride = parsedSpamOverride;
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
        spam_item_limit_override: spamItemLimitOverride,
      });
      setApplyMessage(t('applySuccess'));
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
              spam_item_limit_override: spamItemLimitOverride,
            }
          : null
      );
    } catch (e) {
      const message =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setApplyError(message ? String(message) : t('applyErrorGeneric'));
    } finally {
      setApplyLoading(false);
    }
  }, [feed, canUpdate, statusId, reasonId, note, options, spamItemLimitOverrideInput, t]);

  const handleClickApply = useCallback(() => {
    if (!feed || !canUpdate) {
      return;
    }
    const st = parseInt(statusId, 10);
    if (Number.isNaN(st)) {
      setApplyError(t('applyErrorSelectStatus'));
      return;
    }
    if (st === FEED_FLAG_TAKEDOWN_ID && !reasonId) {
      setApplyError(t('applyErrorTakedownReason'));
      return;
    }
    if (statusRequiresConfirm(st)) {
      setConfirmOpen(true);
    } else {
      void runApply();
    }
  }, [feed, canUpdate, statusId, reasonId, runApply, t]);

  if (optionsLoading) {
    return (
      <div className="container">
        <p>{tc('loading')}</p>
      </div>
    );
  }

  return (
    <div className="container">
      <header className={styles.header}>
        <h1 className="page-title">{t('pageTitle')}</h1>
        <p className="page-subtitle">{t('pageSubtitle')}</p>
        <p className={styles.bread}>
          <Link href="/feed-operations/flag-status" className={styles.breadLink}>
            {t('breadcrumbParent')}
          </Link>
          <span aria-hidden> / </span>
          <span>{t('breadcrumbCurrent')}</span>
        </p>
      </header>

      {optionsError && <Alert variant="error">{optionsError}</Alert>}

      <section className={styles.section} aria-label={t('sectionFindAria')}>
        <Card>
          <h2 className={styles.h2}>{t('findFeedHeading')}</h2>
          <div className={styles.lookupGrid}>
            <FormLabel htmlFor="feed-flag-lookup-mode">{t('searchByLabel')}</FormLabel>
            <FormLabel htmlFor="feed-flag-lookup-value">
              {searchMode === 'url' ? t('searchValueLabelUrl') : t('searchValueLabel')}
            </FormLabel>
            <div className={styles.lookupActionLabel} aria-hidden>
              {'\u00A0'}
            </div>
            <select
              id="feed-flag-lookup-mode"
              className={`${styles.select} ${styles.inlineControl}`}
              value={searchMode}
              onChange={(e) => {
                const v = e.target.value;
                if (v === 'podcast_index_id' || v === 'feed_id' || v === 'url') {
                  setSearchMode(v);
                }
              }}
            >
              <option value="podcast_index_id">{t('searchModePodcastIndexId')}</option>
              <option value="feed_id">{t('searchModeFeedId')}</option>
              <option value="url">{t('searchModeUrl')}</option>
            </select>
            <FormInput
              id="feed-flag-lookup-value"
              className={styles.inlineControl}
              type={searchMode === 'url' ? 'text' : 'number'}
              name="q"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder={searchMode === 'url' ? t('placeholderUrl') : t('placeholderNumber')}
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
              {lookupLoading ? t('lookupLoading') : t('lookupButton')}
            </Button>
          </div>
        </Card>
        {loadError && <Alert variant="error">{loadError}</Alert>}
      </section>

      {feed && (
        <section className={styles.section} aria-label={t('sectionFeedAria')}>
          <Card>
            <h2 className={styles.h2}>{t('thisFeedHeading')}</h2>
            <h3 className={styles.h3}>{t('onRecordHeading')}</h3>
            <dl className={styles.dl}>
              {feed.channel_title && (
                <>
                  <dt>{t('dtChannelTitle')}</dt>
                  <dd>{feed.channel_title}</dd>
                </>
              )}
              <dt>{t('dtUrl')}</dt>
              <dd className={styles.muted}>{feed.url}</dd>
              <dt>{t('dtInternalFeedId')}</dt>
              <dd>{feed.id}</dd>
              <dt>{t('dtPodcastIndexId')}</dt>
              <dd>{feed.podcast_index_id}</dd>
              <dt>{t('dtStatus')}</dt>
              <dd>
                {t('statusDisplay', {
                  status: feed.feed_flag_status_key,
                  id: feed.feed_flag_status_id,
                })}
              </dd>
              <dt>{t('dtSpamOverride')}</dt>
              <dd>{feed.spam_item_limit_override ?? t('emptyValue')}</dd>
              <dt>{t('dtReason')}</dt>
              <dd>{feed.feed_flag_status_reason_key ?? t('emptyValue')}</dd>
              <dt>{t('dtReasonNote')}</dt>
              <dd className={styles.muted}>
                {feed.feed_flag_status_reason_note?.length
                  ? feed.feed_flag_status_reason_note
                  : t('emptyValue')}
              </dd>
            </dl>
            <p className={styles.dbLink}>
              <Link className={styles.inlinelink} href={`/database/feed/${String(feed.id)}`}>
                {t('openInDatabase')}
              </Link>
            </p>

            {canUpdate && options && (
              <div className={styles.feedUpdateForm}>
                <h3 className={styles.h3}>{t('newStatusHeading')}</h3>
                <div className={styles.formBlock}>
                  <FormGroup>
                    <FormLabel>{t('labelNewStatusRequired')}</FormLabel>
                    <select
                      className={styles.select}
                      value={statusId}
                      onChange={(e) => setStatusId(e.target.value)}
                      required
                    >
                      <option value="" disabled>
                        {t('selectStatusPlaceholder')}
                      </option>
                      {options.feed_flag_statuses.map((s) => (
                        <option key={s.id} value={String(s.id)}>
                          {t('selectOptionStatus', { label: s.status, id: s.id })}
                        </option>
                      ))}
                    </select>
                  </FormGroup>
                  <FormGroup>
                    <FormLabel>
                      {parseInt(statusId, 10) === FEED_FLAG_TAKEDOWN_ID
                        ? t('labelReasonTakedownRequired')
                        : t('labelReasonOptional')}
                    </FormLabel>
                    <select
                      className={styles.select}
                      value={reasonId}
                      onChange={(e) => setReasonId(e.target.value)}
                    >
                      <option value="">{t('reasonNone')}</option>
                      {options.feed_flag_status_reasons.map((r) => (
                        <option key={r.id} value={String(r.id)}>
                          {t('selectOptionReason', { label: r.reason, id: r.id })}
                        </option>
                      ))}
                    </select>
                  </FormGroup>
                  <FormGroup>
                    <FormLabel>{t('labelNote')}</FormLabel>
                    <textarea
                      className={styles.textarea}
                      name="note"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={4}
                      maxLength={10000}
                      placeholder={t('notePlaceholder')}
                    />
                  </FormGroup>
                  <FormGroup>
                    <FormLabel>{t('labelSpamOverride')}</FormLabel>
                    <FormInput
                      type="number"
                      name="spam-item-limit-override"
                      value={spamItemLimitOverrideInput}
                      onChange={(e) => setSpamItemLimitOverrideInput(e.target.value)}
                      min={1}
                      step={1}
                      placeholder={t('spamOverridePlaceholder')}
                    />
                  </FormGroup>
                  <p className={styles.hintSmall}>{t('spamOverrideHint')}</p>
                  {applyError && <Alert variant="error">{applyError}</Alert>}
                  {applyMessage && <Alert variant="default">{applyMessage}</Alert>}

                  {confirmOpen && (
                    <div
                      className={styles.confirm}
                      role="dialog"
                      aria-label={t('confirmDialogAria')}
                    >
                      <p>{t('confirmDialogBody')}</p>
                      <div className={styles.confirmRow}>
                        <Button
                          type="button"
                          disabled={applyLoading}
                          onClick={() => {
                            void runApply();
                          }}
                          variant="primary"
                        >
                          {applyLoading ? t('confirmApplying') : tc('confirm')}
                        </Button>
                        <Button
                          type="button"
                          onClick={() => {
                            setConfirmOpen(false);
                          }}
                          variant="default"
                        >
                          {tc('cancel')}
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
                          ? t('confirmApplying')
                          : statusRequiresConfirm(parseInt(statusId, 10) || 0)
                            ? t('continueToConfirm')
                            : t('applyButton')}
                      </Button>
                      {statusRequiresConfirm(parseInt(statusId, 10) || 0) && (
                        <p className={styles.hintSmall}>{t('confirmHint')}</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {!canUpdate && (
              <p className={styles.readonlyHint}>
                {t.rich('readonlyHint', {
                  feedsCode: (chunks) => <code>{chunks}</code>,
                })}
              </p>
            )}
          </Card>
        </section>
      )}
    </div>
  );
}
