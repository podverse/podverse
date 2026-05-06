'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  ActionLink,
  Alert,
  Breadcrumbs,
  Button,
  Card,
  CheckboxField,
  CheckboxFieldList,
  ConfirmPanel,
  ConfirmPanelActions,
  DescriptionList,
  fieldPrimitiveClasses,
  FormContinuationSection,
  FormGroup,
  FormHintText,
  Input,
  Label,
  LoadingText,
  LookupFieldGrid,
  lookupFieldGridButtonClass,
  lookupFieldGridControlClass,
  lookupFieldGridFormBlockClass,
  LookupFieldSpacerLabel,
  ManagementPageShell,
  MutedBreakableText,
  PageSection,
  RestrictedNotice,
  SectionHeading,
  Select,
  TextArea,
} from '@podverse/ui';

import {
  canUpdateFeeds,
  feedOperationsRequireConfirm,
  LIFECYCLE_TAKEDOWN_KEY,
} from '../../../../lib/managementPermissions';
import type { CurrentUser } from '../../../../lib/requests/auth';
import {
  applyFeedOperationsPolicyState,
  type FeedOperationsLookup,
  type FeedOperationsOptionsResponse,
  getFeedOperationOptions,
  lookupFeed,
} from '../../../../lib/requests/feedFlagStatus';

type FlagStatusPageClientProps = {
  user: CurrentUser;
};

type SearchMode = 'podcast_index_id' | 'feed_id' | 'url';

function buildConditionChecked(
  types: { condition_key: string }[],
  activeKeys: string[]
): Record<string, boolean> {
  const active = new Set(activeKeys);
  const next: Record<string, boolean> = {};
  for (const t of types) {
    next[t.condition_key] = active.has(t.condition_key);
  }
  return next;
}

export function FlagStatusPageClient({ user }: FlagStatusPageClientProps) {
  const t = useTranslations('feedFlagStatus');
  const tc = useTranslations('common');
  const canUpdate = canUpdateFeeds(user);
  const [options, setOptions] = useState<FeedOperationsOptionsResponse | null>(null);
  const [searchMode, setSearchMode] = useState<SearchMode>('podcast_index_id');
  const [searchText, setSearchText] = useState('');
  const [feed, setFeed] = useState<FeedOperationsLookup | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [lifecycleStateKey, setLifecycleStateKey] = useState('');
  const [conditionChecked, setConditionChecked] = useState<Record<string, boolean>>({});
  const [takedownReasonKey, setTakedownReasonKey] = useState('');
  const [transitionNote, setTransitionNote] = useState('');
  const [conditionNote, setConditionNote] = useState('');
  const [spamItemLimitOverrideInput, setSpamItemLimitOverrideInput] = useState('');
  const [maxResponseBodyBytesOverrideInput, setMaxResponseBodyBytesOverrideInput] = useState('');
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

  const setFeedStateFromLookup = useCallback(
    (nextFeed: FeedOperationsLookup, conditionTypes: { condition_key: string }[]) => {
      setFeed(nextFeed);
      setLifecycleStateKey(nextFeed.lifecycle_state_key ?? '');
      setConditionChecked(
        buildConditionChecked(conditionTypes, nextFeed.active_condition_keys ?? [])
      );
      setTakedownReasonKey(nextFeed.lifecycle_reason ?? '');
      setTransitionNote('');
      setConditionNote('');
      setSpamItemLimitOverrideInput(
        nextFeed.spam_item_limit_override !== null &&
          nextFeed.spam_item_limit_override !== undefined
          ? String(nextFeed.spam_item_limit_override)
          : ''
      );
      setMaxResponseBodyBytesOverrideInput(
        nextFeed.max_response_body_bytes_override !== null &&
          nextFeed.max_response_body_bytes_override !== undefined
          ? String(nextFeed.max_response_body_bytes_override)
          : ''
      );
    },
    []
  );

  const performLookup = useCallback(async () => {
    setLoadError(null);
    setApplyMessage(null);
    setApplyError(null);
    setFeed(null);
    setLookupLoading(true);
    try {
      const conditionTypes = options?.condition_types ?? [];
      if (searchMode === 'url') {
        if (!searchText.trim()) {
          setLoadError(t('lookupErrorEnterUrl'));
          return;
        }
        const { feed: f } = await lookupFeed({ url: searchText.trim() });
        setFeedStateFromLookup(f, conditionTypes);
        return;
      }
      const n = parseInt(searchText.trim(), 10);
      if (Number.isNaN(n) || n <= 0) {
        setLoadError(t('lookupErrorPositiveNumber'));
        return;
      }
      if (searchMode === 'podcast_index_id') {
        const { feed: f } = await lookupFeed({ podcast_index_id: n });
        setFeedStateFromLookup(f, conditionTypes);
        return;
      }
      const { feed: f } = await lookupFeed({ feed_id: n });
      setFeedStateFromLookup(f, conditionTypes);
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
  }, [options?.condition_types, searchMode, searchText, setFeedStateFromLookup, t]);

  const selectedActiveConditionKeys = useMemo(() => {
    if (!options?.condition_types) {
      return [];
    }
    return options.condition_types
      .map((c) => c.condition_key)
      .filter((key) => conditionChecked[key] === true);
  }, [conditionChecked, options?.condition_types]);

  const needsConfirm = useMemo(() => {
    return feedOperationsRequireConfirm({
      lifecycleStateKey,
      activeConditionKeys: selectedActiveConditionKeys,
    });
  }, [lifecycleStateKey, selectedActiveConditionKeys]);

  const runApply = useCallback(async () => {
    if (!feed || !canUpdate || !options) {
      return;
    }
    if (!lifecycleStateKey) {
      setApplyError(t('applyErrorSelectLifecycle'));
      return;
    }
    if (lifecycleStateKey === LIFECYCLE_TAKEDOWN_KEY) {
      const hasReason = takedownReasonKey.trim().length > 0;
      const hasTransition = transitionNote.trim().length > 0;
      if (!hasReason && !hasTransition) {
        setApplyError(t('applyErrorTakedownDoc'));
        return;
      }
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
    const maxResponseOverrideRaw = maxResponseBodyBytesOverrideInput.trim();
    let maxResponseBodyBytesOverride: number | null = null;
    if (maxResponseOverrideRaw.length > 0) {
      const parsedMaxResponseOverride = parseInt(maxResponseOverrideRaw, 10);
      if (Number.isNaN(parsedMaxResponseOverride) || parsedMaxResponseOverride <= 0) {
        setApplyError(t('applyErrorMaxResponseBytesOverride'));
        return;
      }
      maxResponseBodyBytesOverride = parsedMaxResponseOverride;
    }
    setApplyLoading(true);
    setApplyError(null);
    setApplyMessage(null);
    try {
      const transitionTrim = transitionNote.trim();
      const conditionTrim = conditionNote.trim();
      await applyFeedOperationsPolicyState({
        feed_id: feed.id,
        lifecycle_state_key: lifecycleStateKey,
        active_condition_keys: selectedActiveConditionKeys,
        lifecycle_reason_key:
          lifecycleStateKey === LIFECYCLE_TAKEDOWN_KEY && takedownReasonKey.trim().length > 0
            ? takedownReasonKey.trim()
            : null,
        transition_note: transitionTrim.length > 0 ? transitionTrim : null,
        condition_note: conditionTrim.length > 0 ? conditionTrim : null,
        spam_item_limit_override: spamItemLimitOverride,
        max_response_body_bytes_override: maxResponseBodyBytesOverride,
      });
      setApplyMessage(t('applySuccess'));
      setConfirmOpen(false);
      setFeed((prev) =>
        prev
          ? {
              ...prev,
              lifecycle_state_key: lifecycleStateKey,
              lifecycle_reason:
                lifecycleStateKey === LIFECYCLE_TAKEDOWN_KEY && takedownReasonKey.trim().length > 0
                  ? takedownReasonKey.trim()
                  : prev.lifecycle_reason,
              active_condition_keys: selectedActiveConditionKeys,
              spam_item_limit_override: spamItemLimitOverride,
              max_response_body_bytes_override: maxResponseBodyBytesOverride,
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
  }, [
    feed,
    canUpdate,
    options,
    lifecycleStateKey,
    takedownReasonKey,
    transitionNote,
    conditionNote,
    selectedActiveConditionKeys,
    spamItemLimitOverrideInput,
    maxResponseBodyBytesOverrideInput,
    t,
  ]);

  const handleClickApply = useCallback(() => {
    if (!feed || !canUpdate) {
      return;
    }
    if (!lifecycleStateKey) {
      setApplyError(t('applyErrorSelectLifecycle'));
      return;
    }
    if (lifecycleStateKey === LIFECYCLE_TAKEDOWN_KEY) {
      const hasReason = takedownReasonKey.trim().length > 0;
      const hasTransition = transitionNote.trim().length > 0;
      if (!hasReason && !hasTransition) {
        setApplyError(t('applyErrorTakedownDoc'));
        return;
      }
    }
    if (needsConfirm) {
      setConfirmOpen(true);
    } else {
      void runApply();
    }
  }, [
    feed,
    canUpdate,
    lifecycleStateKey,
    takedownReasonKey,
    transitionNote,
    needsConfirm,
    runApply,
    t,
  ]);

  if (optionsLoading) {
    return (
      <ManagementPageShell title={t('pageTitle')}>
        <LoadingText>{tc('loading')}</LoadingText>
      </ManagementPageShell>
    );
  }

  return (
    <ManagementPageShell
      headerChildren={
        <Breadcrumbs
          LinkComponent={Link}
          variant="compact"
          navAriaLabel={tc('breadcrumbNav')}
          items={[
            { href: '/feed-operations/flag-status', label: t('breadcrumbParent') },
            { label: t('breadcrumbCurrent') },
          ]}
        />
      }
      subtitle={t('pageSubtitle')}
      title={t('pageTitle')}
    >
      {optionsError && <Alert variant="error">{optionsError}</Alert>}

      <PageSection aria-label={t('sectionFindAria')}>
        <Card>
          <SectionHeading level={2}>{t('findFeedHeading')}</SectionHeading>
          <LookupFieldGrid>
            <Label htmlFor="feed-flag-lookup-mode">{t('searchByLabel')}</Label>
            <Label htmlFor="feed-flag-lookup-value">
              {searchMode === 'url' ? t('searchValueLabelUrl') : t('searchValueLabel')}
            </Label>
            <LookupFieldSpacerLabel aria-hidden>{'\u00A0'}</LookupFieldSpacerLabel>
            <Select
              id="feed-flag-lookup-mode"
              className={`${fieldPrimitiveClasses.select} ${lookupFieldGridControlClass}`}
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
            </Select>
            <Input
              id="feed-flag-lookup-value"
              className={lookupFieldGridControlClass}
              type={searchMode === 'url' ? 'text' : 'number'}
              name="q"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder={searchMode === 'url' ? t('placeholderUrl') : t('placeholderNumber')}
              autoComplete="off"
            />
            <Button
              className={lookupFieldGridButtonClass}
              disabled={lookupLoading}
              onClick={() => {
                void performLookup();
              }}
              type="button"
              variant="primary"
            >
              {lookupLoading ? t('lookupLoading') : t('lookupButton')}
            </Button>
          </LookupFieldGrid>
        </Card>
        {loadError && <Alert variant="error">{loadError}</Alert>}
      </PageSection>

      {feed && (
        <PageSection aria-label={t('sectionFeedAria')}>
          <Card>
            <SectionHeading level={2}>{t('thisFeedHeading')}</SectionHeading>
            <SectionHeading level={4}>{t('onRecordHeading')}</SectionHeading>
            <DescriptionList variant="flat">
              {feed.channel_title && (
                <>
                  <dt>{t('dtChannelTitle')}</dt>
                  <dd>{feed.channel_title}</dd>
                </>
              )}
              <dt>{t('dtUrl')}</dt>
              <dd>
                <MutedBreakableText>{feed.url}</MutedBreakableText>
              </dd>
              <dt>{t('dtInternalFeedId')}</dt>
              <dd>{feed.id}</dd>
              <dt>{t('dtPodcastIndexId')}</dt>
              <dd>{feed.podcast_index_id}</dd>
              <dt>{t('dtLifecycle')}</dt>
              <dd>{t('lifecycleDisplay', { state: feed.lifecycle_state_key })}</dd>
              <dt>{t('dtActiveConditions')}</dt>
              <dd>
                {feed.active_condition_keys?.length
                  ? feed.active_condition_keys.join(', ')
                  : t('emptyValue')}
              </dd>
              <dt>{t('dtEffectivePolicy')}</dt>
              <dd>
                {t('effectivePolicyDisplay', {
                  parse: feed.parse_allowed ? t('boolYes') : t('boolNo'),
                  public: feed.public_visible ? t('boolYes') : t('boolNo'),
                  add: feed.add_allowed ? t('boolYes') : t('boolNo'),
                  reason: feed.primary_block_reason ?? t('emptyValue'),
                })}
              </dd>
              <dt>{t('dtSpamOverride')}</dt>
              <dd>{feed.spam_item_limit_override ?? t('emptyValue')}</dd>
              <dt>{t('dtMaxResponseBytesOverride')}</dt>
              <dd>{feed.max_response_body_bytes_override ?? t('emptyValue')}</dd>
              <dt>{t('dtLifecycleReason')}</dt>
              <dd>{feed.lifecycle_reason ?? t('emptyValue')}</dd>
              <dt>{t('dtUpdatedSource')}</dt>
              <dd>{feed.updated_source}</dd>
            </DescriptionList>
            <p>
              <ActionLink
                href={`/database/feed/${String(feed.id)}`}
                LinkComponent={Link}
                variant="inline"
              >
                {t('openInDatabase')}
              </ActionLink>
            </p>

            {canUpdate && options && (
              <FormContinuationSection>
                <SectionHeading level={4}>{t('newValuesHeading')}</SectionHeading>
                <div className={lookupFieldGridFormBlockClass}>
                  <FormGroup>
                    <Label>{t('labelLifecycleRequired')}</Label>
                    <Select
                      className={fieldPrimitiveClasses.select}
                      value={lifecycleStateKey}
                      onChange={(e) => setLifecycleStateKey(e.target.value)}
                      required
                    >
                      <option value="" disabled>
                        {t('selectLifecyclePlaceholder')}
                      </option>
                      {options.lifecycle_states.map((s) => (
                        <option key={s.state_key} value={s.state_key}>
                          {t('selectOptionLifecycle', { state: s.state_key })}
                        </option>
                      ))}
                    </Select>
                  </FormGroup>

                  <FormGroup>
                    <Label>{t('labelActiveConditions')}</Label>
                    <CheckboxFieldList>
                      {options.condition_types.map((c) => (
                        <CheckboxField
                          key={c.condition_key}
                          label={c.condition_key}
                          checked={conditionChecked[c.condition_key] === true}
                          onChange={(checked) => {
                            setConditionChecked((prev) => ({
                              ...prev,
                              [c.condition_key]: checked,
                            }));
                          }}
                        />
                      ))}
                    </CheckboxFieldList>
                  </FormGroup>

                  {lifecycleStateKey === LIFECYCLE_TAKEDOWN_KEY && (
                    <FormGroup>
                      <Label>{t('labelTakedownReasonOptional')}</Label>
                      <Select
                        className={fieldPrimitiveClasses.select}
                        value={takedownReasonKey}
                        onChange={(e) => setTakedownReasonKey(e.target.value)}
                      >
                        <option value="">{t('takedownReasonPlaceholder')}</option>
                        {options.takedown_reasons.map((r) => (
                          <option key={r.reason} value={r.reason}>
                            {r.reason}
                          </option>
                        ))}
                      </Select>
                    </FormGroup>
                  )}

                  <FormGroup>
                    <Label>{t('labelTransitionNote')}</Label>
                    <TextArea
                      name="transition-note"
                      value={transitionNote}
                      onChange={(e) => setTransitionNote(e.target.value)}
                      rows={3}
                      maxLength={10000}
                      placeholder={t('transitionNotePlaceholder')}
                    />
                  </FormGroup>

                  <FormGroup>
                    <Label>{t('labelConditionNote')}</Label>
                    <TextArea
                      name="condition-note"
                      value={conditionNote}
                      onChange={(e) => setConditionNote(e.target.value)}
                      rows={3}
                      maxLength={10000}
                      placeholder={t('conditionNotePlaceholder')}
                    />
                  </FormGroup>

                  <FormGroup>
                    <Label>{t('labelSpamOverride')}</Label>
                    <Input
                      type="number"
                      name="spam-item-limit-override"
                      value={spamItemLimitOverrideInput}
                      onChange={(e) => setSpamItemLimitOverrideInput(e.target.value)}
                      min={1}
                      step={1}
                      placeholder={t('spamOverridePlaceholder')}
                    />
                  </FormGroup>
                  <FormHintText variant="block">{t('spamOverrideHint')}</FormHintText>
                  <FormGroup>
                    <Label>{t('labelMaxResponseBytesOverride')}</Label>
                    <Input
                      type="number"
                      name="max-response-body-bytes-override"
                      value={maxResponseBodyBytesOverrideInput}
                      onChange={(e) => setMaxResponseBodyBytesOverrideInput(e.target.value)}
                      min={1}
                      step={1}
                      placeholder={t('maxResponseBytesOverridePlaceholder')}
                    />
                  </FormGroup>
                  {applyError && <Alert variant="error">{applyError}</Alert>}
                  {applyMessage && <Alert variant="default">{applyMessage}</Alert>}

                  {confirmOpen && (
                    <div role="dialog" aria-label={t('confirmDialogAria')}>
                      <ConfirmPanel>
                        <p>{t('confirmDialogBody')}</p>
                        <ConfirmPanelActions>
                          <Button
                            type="button"
                            onClick={() => {
                              setConfirmOpen(false);
                            }}
                            variant="secondary"
                          >
                            {tc('cancel')}
                          </Button>
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
                        </ConfirmPanelActions>
                      </ConfirmPanel>
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
                          : needsConfirm
                            ? t('continueToConfirm')
                            : t('applyButton')}
                      </Button>
                      {needsConfirm && (
                        <FormHintText variant="block">{t('confirmHint')}</FormHintText>
                      )}
                    </>
                  )}
                </div>
              </FormContinuationSection>
            )}

            {!canUpdate && (
              <RestrictedNotice>
                <FormHintText variant="block">
                  {t.rich('readonlyHint', {
                    feedsCode: (chunks) => <code>{chunks}</code>,
                  })}
                </FormHintText>
              </RestrictedNotice>
            )}
          </Card>
        </PageSection>
      )}
    </ManagementPageShell>
  );
}
