'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import type { FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { formatDateTimeAbbrev, fromDatetimeLocalInputValue } from '@podverse/helpers';
import type { FormDropdownOption } from '@podverse/ui';
import {
  Alert,
  Breadcrumbs,
  Button,
  FormDropdown,
  FormGroup,
  FormMaxWidth,
  FormPrimaryActions,
  FormStack,
  FormTextArea,
  ManagementPageShell,
  Modal,
  SectionHeading,
  StackForm,
  Table,
  TextInput,
} from '@podverse/ui';

import { ManagementLoadingSpinnerOverlay } from '../../../../../components/LoadingSpinner/ManagementLoadingSpinnerOverlay';
import {
  canEndBillingMembership,
  canGrantBillingMembership,
  canResyncBillingAccount,
} from '../../../../../lib/managementPermissions';
import type { CurrentUser } from '../../../../../lib/requests/auth';
import type {
  BillingAccountDetail,
  GrantBillingMembershipBody,
} from '../../../../../lib/requests/billing';
import {
  BILLING_MEMBERSHIP_EXTEND_DAYS_MAX,
  BILLING_MEMBERSHIP_EXTEND_DAYS_MIN,
  BILLING_MEMBERSHIP_NOTE_MAX_LENGTH,
  getBillingAccount,
  grantBillingMembership,
  readBillingMembershipRequestError,
  reqBillingEndMembership,
  reqBillingRevokeGrant,
  resyncBillingAccount,
} from '../../../../../lib/requests/billing';
import { buildUserEditPath, ROUTES } from '../../../../../lib/routes';

export type UserBillingPageClientProps = {
  initialUser: CurrentUser;
  accountId: number;
};

type Cadence = 'monthly' | 'annual';
type ExtendMode = 'plan' | 'days' | 'date';
type WorkingKind = 'extend' | 'resync' | 'end' | 'revoke';

function isCadence(value: string): value is Cadence {
  return value === 'monthly' || value === 'annual';
}

function isExtendMode(value: string): value is ExtendMode {
  return value === 'plan' || value === 'days' || value === 'date';
}

function optionalNote(note: string): { note?: string } {
  const trimmed = note.trim();
  if (trimmed === '') {
    return {};
  }
  return { note: trimmed };
}

function parseExtendDays(value: string): number | null {
  if (!/^[0-9]+$/.test(value.trim())) {
    return null;
  }
  const days = Number(value.trim());
  if (
    !Number.isInteger(days) ||
    days < BILLING_MEMBERSHIP_EXTEND_DAYS_MIN ||
    days > BILLING_MEMBERSHIP_EXTEND_DAYS_MAX
  ) {
    return null;
  }
  return days;
}

function resolveExtendBody(params: {
  cadence: Cadence;
  daysInput: string;
  mode: ExtendMode;
  note: string;
  untilLocal: string;
}): { body: GrantBillingMembershipBody } | { errorKey: 'days' | 'date' } {
  const notePart = optionalNote(params.note);
  if (params.mode === 'plan') {
    return { body: { cadence: params.cadence, ...notePart } };
  }
  if (params.mode === 'days') {
    const days = parseExtendDays(params.daysInput);
    if (days === null) {
      return { errorKey: 'days' };
    }
    return { body: { days, ...notePart } };
  }
  const parsed = fromDatetimeLocalInputValue(params.untilLocal);
  if (parsed === null || parsed.getTime() <= Date.now()) {
    return { errorKey: 'date' };
  }
  return { body: { ends_at: parsed.toISOString(), ...notePart } };
}

export function UserBillingPageClient({ initialUser, accountId }: UserBillingPageClientProps) {
  const [user] = useState(initialUser);
  const [detail, setDetail] = useState<BillingAccountDetail | null>(null);
  const [resyncCounts, setResyncCounts] = useState<{
    retried: number;
    refetched: number;
    failed: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [workingKind, setWorkingKind] = useState<WorkingKind | null>(null);
  const workingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [extendMode, setExtendMode] = useState<ExtendMode>('plan');
  const [cadence, setCadence] = useState<Cadence>('annual');
  const [daysInput, setDaysInput] = useState('');
  const [untilLocal, setUntilLocal] = useState('');
  const [note, setNote] = useState('');
  const [endLocal, setEndLocal] = useState('');
  const [endConfirmIso, setEndConfirmIso] = useState<string | null>(null);
  const [revokeGrantId, setRevokeGrantId] = useState<number | null>(null);
  const t = useTranslations('billing');
  const tc = useTranslations('common');
  const tNav = useTranslations('nav');
  const locale = useLocale();
  const canResync = canResyncBillingAccount(user);
  const canGrant = canGrantBillingMembership(user);
  const canEnd = canEndBillingMembership(user);

  const formatTimestamp = useCallback(
    (value: string | null) => (value === null ? tc('none') : formatDateTimeAbbrev(value, locale)),
    [locale, tc]
  );

  const describeFailure = useCallback(
    (requestError: unknown, fallback: string) => {
      const parsed = readBillingMembershipRequestError(requestError);
      if (parsed === null) {
        return fallback;
      }
      if (parsed.accessEndsAt === null) {
        return parsed.message;
      }
      return `${parsed.message} ${t('account.protectedAccess', {
        date: formatTimestamp(parsed.accessEndsAt),
      })}`;
    },
    [formatTimestamp, t]
  );

  const working = workingKind !== null;

  const beginWork = (kind: WorkingKind) => {
    if (workingRef.current) {
      return false;
    }
    workingRef.current = true;
    setWorkingKind(kind);
    return true;
  };

  const endWork = () => {
    workingRef.current = false;
    setWorkingKind(null);
  };

  const cadenceOptions = useMemo<FormDropdownOption[]>(
    () => [
      { value: 'monthly', label: t('products.cadenceMonthly') },
      { value: 'annual', label: t('products.cadenceAnnual') },
    ],
    [t]
  );

  const modeOptions = useMemo<FormDropdownOption[]>(
    () => [
      { value: 'plan', label: t('account.extend.modePlan') },
      { value: 'days', label: t('account.extend.modeDays') },
      { value: 'date', label: t('account.extend.modeDate') },
    ],
    [t]
  );

  const load = useCallback(async () => {
    const result = await getBillingAccount(accountId);
    setDetail(result.data);
  }, [accountId]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        await load();
      } catch {
        if (!cancelled) {
          setError(t('account.failedToLoad'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [load, t]);

  const resyncAccount = async () => {
    if (!beginWork('resync')) {
      return;
    }
    setError(null);
    setNotice(null);
    try {
      const result = await resyncBillingAccount(accountId);
      setResyncCounts({
        retried: result.data.retried,
        refetched: result.data.refetched,
        failed: result.data.failed,
      });
      await load();
      setNotice(t('account.resynced'));
    } catch {
      setError(t('account.failedToResync'));
    } finally {
      endWork();
    }
  };

  const submitExtend = async (event: FormEvent) => {
    event.preventDefault();
    const resolved = resolveExtendBody({
      cadence,
      daysInput,
      mode: extendMode,
      note,
      untilLocal,
    });
    if (!('body' in resolved)) {
      setNotice(null);
      setError(
        resolved.errorKey === 'days'
          ? t('account.extend.daysInvalid')
          : t('account.extend.dateFuture')
      );
      return;
    }
    if (!beginWork('extend')) {
      return;
    }
    setError(null);
    setNotice(null);
    try {
      const result = await grantBillingMembership(accountId, resolved.body);
      await load();
      if (result.data.applied) {
        setNotice(
          t('account.extend.success', {
            date: formatTimestamp(result.data.membership_expires_at),
          })
        );
        setNote('');
      } else {
        setNotice(t('account.grantNotApplied'));
      }
    } catch (requestError) {
      setError(describeFailure(requestError, t('account.failedToGrant')));
    } finally {
      endWork();
    }
  };

  const openEndOnDate = () => {
    const parsed = fromDatetimeLocalInputValue(endLocal);
    if (parsed === null) {
      setNotice(null);
      setError(t('account.end.dateRequired'));
      return;
    }
    setError(null);
    setEndConfirmIso(parsed.toISOString());
  };

  const openEndNow = () => {
    setError(null);
    setEndConfirmIso(new Date().toISOString());
  };

  const confirmEnd = async () => {
    if (endConfirmIso === null || !beginWork('end')) {
      return;
    }
    setError(null);
    setNotice(null);
    try {
      const result = await reqBillingEndMembership(accountId, { ends_at: endConfirmIso });
      await load();
      setNotice(
        t('account.end.success', {
          date: formatTimestamp(result.data.membership_expires_at),
        })
      );
      setEndConfirmIso(null);
    } catch (requestError) {
      setError(describeFailure(requestError, t('account.end.failed')));
      setEndConfirmIso(null);
    } finally {
      endWork();
    }
  };

  const confirmRevoke = async () => {
    if (revokeGrantId === null || !beginWork('revoke')) {
      return;
    }
    setError(null);
    setNotice(null);
    try {
      await reqBillingRevokeGrant(accountId, revokeGrantId, {});
      await load();
      setNotice(t('account.revoke.success'));
      setRevokeGrantId(null);
    } catch (requestError) {
      setError(describeFailure(requestError, t('account.revoke.failed')));
      setRevokeGrantId(null);
    } finally {
      endWork();
    }
  };

  const grantColumnCount = canEnd ? 5 : 4;

  return (
    <ManagementPageShell
      headerBreadcrumbs={
        <Breadcrumbs
          LinkComponent={Link}
          navAriaLabel={tc('breadcrumbNav')}
          items={[
            { href: ROUTES.DASHBOARD, label: tNav('dashboard') },
            { href: ROUTES.USERS, label: tNav('users') },
            { href: buildUserEditPath(accountId), label: String(accountId) },
            { label: t('account.title') },
          ]}
        />
      }
      title={t('account.title')}
    >
      <ManagementLoadingSpinnerOverlay isLoading={loading} />
      <Alert>{error !== null ? <span role="alert">{error}</span> : null}</Alert>
      {notice !== null ? (
        <Alert variant="success">
          <span role="status">{notice}</span>
        </Alert>
      ) : null}
      {!loading && detail !== null ? (
        <>
          <p>
            {t('account.expires')}:{' '}
            {detail.membership_expires_at === null ? (
              tc('none')
            ) : (
              <time dateTime={detail.membership_expires_at} id="membership-expires-at">
                {formatTimestamp(detail.membership_expires_at)}
              </time>
            )}
          </p>
          {canGrant ? (
            <>
              <SectionHeading>{t('account.extend.title')}</SectionHeading>
              <FormMaxWidth>
                <StackForm onSubmit={(event) => void submitExtend(event)}>
                  <FormStack>
                    <FormGroup>
                      <FormDropdown
                        id="account-billing-extend-mode"
                        eyebrow={t('account.extend.mode')}
                        options={modeOptions}
                        value={extendMode}
                        onChange={(value) => {
                          if (isExtendMode(value)) {
                            setExtendMode(value);
                          }
                        }}
                      />
                      {extendMode === 'plan' ? (
                        <FormDropdown
                          id="account-billing-grant-cadence"
                          eyebrow={t('account.grantCadenceLabel')}
                          options={cadenceOptions}
                          value={cadence}
                          onChange={(value) => {
                            if (isCadence(value)) {
                              setCadence(value);
                            }
                          }}
                        />
                      ) : null}
                      {extendMode === 'days' ? (
                        <TextInput
                          id="account-billing-extend-days"
                          eyebrow={t('account.extend.days')}
                          max={BILLING_MEMBERSHIP_EXTEND_DAYS_MAX}
                          min={BILLING_MEMBERSHIP_EXTEND_DAYS_MIN}
                          step={1}
                          type="number"
                          value={daysInput}
                          onChange={(event) => {
                            setDaysInput(event.target.value);
                          }}
                        />
                      ) : null}
                      {extendMode === 'date' ? (
                        <TextInput
                          id="account-billing-extend-until"
                          eyebrow={t('account.extend.untilDate')}
                          nativePickerAffixAriaLabel={t('account.datePickerAffix')}
                          type="datetime-local"
                          value={untilLocal}
                          onChange={(event) => {
                            setUntilLocal(event.target.value);
                          }}
                        />
                      ) : null}
                      <FormTextArea
                        id="account-billing-extend-note"
                        eyebrow={t('account.extend.note')}
                        info={t('account.extend.noteHelp')}
                        maxLength={BILLING_MEMBERSHIP_NOTE_MAX_LENGTH}
                        rows={3}
                        value={note}
                        onChange={(event) => {
                          setNote(event.target.value);
                        }}
                      />
                      <FormPrimaryActions>
                        <Button
                          disabled={working}
                          isLoading={workingKind === 'extend'}
                          type="submit"
                        >
                          {t('account.extend.submit')}
                        </Button>
                      </FormPrimaryActions>
                    </FormGroup>
                  </FormStack>
                </StackForm>
              </FormMaxWidth>
            </>
          ) : null}
          {canEnd ? (
            <>
              <SectionHeading>{t('account.end.title')}</SectionHeading>
              <FormMaxWidth>
                <StackForm
                  onSubmit={(event) => {
                    event.preventDefault();
                    openEndOnDate();
                  }}
                >
                  <FormStack>
                    <FormGroup>
                      <TextInput
                        id="account-billing-end-date"
                        eyebrow={t('account.end.date')}
                        nativePickerAffixAriaLabel={t('account.datePickerAffix')}
                        type="datetime-local"
                        value={endLocal}
                        onChange={(event) => {
                          setEndLocal(event.target.value);
                        }}
                      />
                      <FormPrimaryActions>
                        <Button disabled={working} type="submit">
                          {t('account.end.submitDate')}
                        </Button>
                        <Button disabled={working} type="button" onClick={openEndNow}>
                          {t('account.end.submitNow')}
                        </Button>
                      </FormPrimaryActions>
                    </FormGroup>
                  </FormStack>
                </StackForm>
              </FormMaxWidth>
            </>
          ) : null}
          {canResync ? (
            <FormPrimaryActions>
              <Button
                disabled={working}
                isLoading={workingKind === 'resync'}
                type="button"
                onClick={() => void resyncAccount()}
              >
                {t('account.resync')}
              </Button>
            </FormPrimaryActions>
          ) : null}
          {resyncCounts !== null ? (
            <p id="account-billing-resync-counts">{t('account.resyncCounts', resyncCounts)}</p>
          ) : null}
          <SectionHeading>{t('account.transactions')}</SectionHeading>
          <Table.ScrollContainer>
            <Table>
              <Table.Head>
                <Table.Row>
                  <Table.HeaderCell>{t('account.table.processor')}</Table.HeaderCell>
                  <Table.HeaderCell>{t('account.table.externalId')}</Table.HeaderCell>
                  <Table.HeaderCell>{t('account.table.amount')}</Table.HeaderCell>
                  <Table.HeaderCell>{t('account.table.settledAt')}</Table.HeaderCell>
                  <Table.HeaderCell>{t('account.table.revoked')}</Table.HeaderCell>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {detail.transactions.map((transaction) => (
                  <Table.Row key={transaction.id}>
                    <Table.Cell>{transaction.processor_id}</Table.Cell>
                    <Table.Cell>{transaction.external_transaction_id}</Table.Cell>
                    <Table.Cell>
                      {transaction.amount === null
                        ? tc('none')
                        : `${transaction.amount} ${transaction.currency_code ?? ''}`}
                    </Table.Cell>
                    <Table.Cell>{formatTimestamp(transaction.settled_at)}</Table.Cell>
                    <Table.Cell>{formatTimestamp(transaction.revoked_at)}</Table.Cell>
                  </Table.Row>
                ))}
                {detail.transactions.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={5}>{t('account.empty')}</Table.Cell>
                  </Table.Row>
                ) : null}
              </Table.Body>
            </Table>
          </Table.ScrollContainer>
          <SectionHeading>{t('account.grants')}</SectionHeading>
          <Table.ScrollContainer>
            <Table>
              <Table.Head>
                <Table.Row>
                  <Table.HeaderCell>{t('account.table.source')}</Table.HeaderCell>
                  <Table.HeaderCell>{t('account.table.starts')}</Table.HeaderCell>
                  <Table.HeaderCell>{t('account.table.ends')}</Table.HeaderCell>
                  <Table.HeaderCell>{t('account.table.revoked')}</Table.HeaderCell>
                  {canEnd ? <Table.HeaderCell>{tc('actions')}</Table.HeaderCell> : null}
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {detail.grants.map((grantRow) => (
                  <Table.Row key={grantRow.id}>
                    <Table.Cell>{grantRow.source}</Table.Cell>
                    <Table.Cell>{formatTimestamp(grantRow.starts_at)}</Table.Cell>
                    <Table.Cell>{formatTimestamp(grantRow.ends_at)}</Table.Cell>
                    <Table.Cell>{formatTimestamp(grantRow.revoked_at)}</Table.Cell>
                    {canEnd ? (
                      <Table.Cell>
                        {grantRow.admin_editable ? (
                          <Button
                            aria-label={t('account.revoke.actionName', {
                              source: grantRow.source,
                              date: formatTimestamp(grantRow.ends_at),
                            })}
                            disabled={working}
                            type="button"
                            onClick={() => {
                              setRevokeGrantId(grantRow.id);
                            }}
                          >
                            {t('account.revoke.action')}
                          </Button>
                        ) : null}
                      </Table.Cell>
                    ) : null}
                  </Table.Row>
                ))}
                {detail.grants.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={grantColumnCount}>{t('account.empty')}</Table.Cell>
                  </Table.Row>
                ) : null}
              </Table.Body>
            </Table>
          </Table.ScrollContainer>
          <Modal
            ariaLabel={t('account.end.confirmTitle')}
            closeButtonAriaLabel={tc('closeModalAria')}
            header={t('account.end.confirmTitle')}
            isOpen={endConfirmIso !== null}
            onClose={() => {
              if (!working) {
                setEndConfirmIso(null);
              }
            }}
          >
            <Modal.Body>
              <p>
                {t('account.end.confirmBody', {
                  date: endConfirmIso === null ? tc('none') : formatTimestamp(endConfirmIso),
                })}
              </p>
            </Modal.Body>
            <Modal.Actions>
              <Button
                disabled={working}
                type="button"
                variant="secondary"
                onClick={() => {
                  setEndConfirmIso(null);
                }}
              >
                {tc('cancel')}
              </Button>
              <Button
                disabled={working}
                isLoading={workingKind === 'end'}
                type="button"
                onClick={() => void confirmEnd()}
              >
                {tc('confirm')}
              </Button>
            </Modal.Actions>
          </Modal>
          <Modal
            ariaLabel={t('account.revoke.confirmTitle')}
            closeButtonAriaLabel={tc('closeModalAria')}
            header={t('account.revoke.confirmTitle')}
            isOpen={revokeGrantId !== null}
            onClose={() => {
              if (!working) {
                setRevokeGrantId(null);
              }
            }}
          >
            <Modal.Body>
              <p>{t('account.revoke.confirmBody')}</p>
            </Modal.Body>
            <Modal.Actions>
              <Button
                disabled={working}
                type="button"
                variant="secondary"
                onClick={() => {
                  setRevokeGrantId(null);
                }}
              >
                {tc('cancel')}
              </Button>
              <Button
                disabled={working}
                isLoading={workingKind === 'revoke'}
                type="button"
                onClick={() => void confirmRevoke()}
              >
                {tc('confirm')}
              </Button>
            </Modal.Actions>
          </Modal>
        </>
      ) : null}
    </ManagementPageShell>
  );
}
