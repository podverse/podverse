'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';

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
  ManagementPageShell,
  SectionHeading,
  StackForm,
  Table,
} from '@podverse/ui';

import { ManagementLoadingSpinnerOverlay } from '../../../../../components/LoadingSpinner/ManagementLoadingSpinnerOverlay';
import {
  canGrantBillingMembership,
  canResyncBillingAccount,
} from '../../../../../lib/managementPermissions';
import type { CurrentUser } from '../../../../../lib/requests/auth';
import type {
  BillingAccountDetail,
  BillingResyncResult,
} from '../../../../../lib/requests/billing';
import {
  getBillingAccount,
  grantBillingMembership,
  resyncBillingAccount,
} from '../../../../../lib/requests/billing';
import { buildUserEditPath, ROUTES } from '../../../../../lib/routes';

export type UserBillingPageClientProps = {
  initialUser: CurrentUser;
  accountId: number;
};

type Cadence = 'monthly' | 'annual';

function isCadence(value: string): value is Cadence {
  return value === 'monthly' || value === 'annual';
}

export function UserBillingPageClient({ initialUser, accountId }: UserBillingPageClientProps) {
  const [user] = useState(initialUser);
  const [detail, setDetail] = useState<BillingAccountDetail | null>(null);
  const [resync, setResync] = useState<BillingResyncResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cadence, setCadence] = useState<Cadence>('annual');
  const t = useTranslations('billing');
  const tc = useTranslations('common');
  const tNav = useTranslations('nav');
  const canResync = canResyncBillingAccount(user);
  const canGrant = canGrantBillingMembership(user);

  const cadenceOptions = useMemo<FormDropdownOption[]>(
    () => [
      { value: 'monthly', label: t('products.cadenceMonthly') },
      { value: 'annual', label: t('products.cadenceAnnual') },
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
    setWorking(true);
    setError(null);
    setNotice(null);
    try {
      const result = await resyncBillingAccount(accountId);
      setResync(result.data);
      await load();
      setNotice(t('account.resynced'));
    } catch {
      setError(t('account.failedToResync'));
    } finally {
      setWorking(false);
    }
  };

  const grant = async (event: React.FormEvent) => {
    event.preventDefault();
    setWorking(true);
    setError(null);
    setNotice(null);
    try {
      const result = await grantBillingMembership(accountId, cadence);
      await load();
      setNotice(result.data.applied ? t('account.granted') : t('account.grantNotApplied'));
    } catch {
      setError(t('account.failedToGrant'));
    } finally {
      setWorking(false);
    }
  };

  const formatDate = (value: string | null) =>
    value === null ? tc('none') : new Date(value).toLocaleString();

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
      <Alert>{error}</Alert>
      {notice !== null ? <Alert variant="success">{notice}</Alert> : null}
      {!loading && detail !== null ? (
        <>
          <p>
            {t('account.expires')}: {formatDate(detail.membership_expires_at)}
          </p>
          {canResync || canGrant ? (
            <FormMaxWidth>
              <StackForm onSubmit={(event) => void grant(event)}>
                <FormStack>
                  <FormGroup>
                    {canGrant ? (
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
                    <FormPrimaryActions>
                      {canResync ? (
                        <Button
                          type="button"
                          onClick={() => void resyncAccount()}
                          disabled={working}
                        >
                          {t('account.resync')}
                        </Button>
                      ) : null}
                      {canGrant ? (
                        <Button type="submit" disabled={working}>
                          {t('account.grant')}
                        </Button>
                      ) : null}
                    </FormPrimaryActions>
                  </FormGroup>
                </FormStack>
              </StackForm>
            </FormMaxWidth>
          ) : null}
          {resync !== null ? (
            <ul>
              {resync.subscriptions.map((result) => (
                <li key={result.subscription_id}>
                  {result.processor_id} {result.subscription_id}: {result.status}
                  {result.reason !== undefined ? ` (${result.reason})` : ''}
                </li>
              ))}
            </ul>
          ) : null}
          <SectionHeading>{t('account.subscriptions')}</SectionHeading>
          <Table.ScrollContainer>
            <Table>
              <Table.Head>
                <Table.Row>
                  <Table.HeaderCell>{t('account.table.processor')}</Table.HeaderCell>
                  <Table.HeaderCell>{t('account.table.externalId')}</Table.HeaderCell>
                  <Table.HeaderCell>{t('account.table.status')}</Table.HeaderCell>
                  <Table.HeaderCell>{t('account.table.periodEnd')}</Table.HeaderCell>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {detail.subscriptions.map((subscription) => (
                  <Table.Row key={subscription.id}>
                    <Table.Cell>{subscription.processor_id}</Table.Cell>
                    <Table.Cell>{subscription.external_subscription_id}</Table.Cell>
                    <Table.Cell>{subscription.status}</Table.Cell>
                    <Table.Cell>{formatDate(subscription.current_period_end)}</Table.Cell>
                  </Table.Row>
                ))}
                {detail.subscriptions.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={4}>{t('account.empty')}</Table.Cell>
                  </Table.Row>
                ) : null}
              </Table.Body>
            </Table>
          </Table.ScrollContainer>
          <SectionHeading>{t('account.transactions')}</SectionHeading>
          <Table.ScrollContainer>
            <Table>
              <Table.Head>
                <Table.Row>
                  <Table.HeaderCell>{t('account.table.processor')}</Table.HeaderCell>
                  <Table.HeaderCell>{t('account.table.amount')}</Table.HeaderCell>
                  <Table.HeaderCell>{t('account.table.settledAt')}</Table.HeaderCell>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {detail.transactions.map((transaction) => (
                  <Table.Row key={transaction.id}>
                    <Table.Cell>{transaction.processor_id}</Table.Cell>
                    <Table.Cell>
                      {transaction.amount === null
                        ? tc('none')
                        : `${transaction.amount} ${transaction.currency_code ?? ''}`}
                    </Table.Cell>
                    <Table.Cell>{formatDate(transaction.settled_at)}</Table.Cell>
                  </Table.Row>
                ))}
                {detail.transactions.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={3}>{t('account.empty')}</Table.Cell>
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
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {detail.grants.map((grant) => (
                  <Table.Row key={grant.id}>
                    <Table.Cell>{grant.source}</Table.Cell>
                    <Table.Cell>{formatDate(grant.starts_at)}</Table.Cell>
                    <Table.Cell>{formatDate(grant.revoked_at ?? grant.ends_at)}</Table.Cell>
                  </Table.Row>
                ))}
                {detail.grants.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={3}>{t('account.empty')}</Table.Cell>
                  </Table.Row>
                ) : null}
              </Table.Body>
            </Table>
          </Table.ScrollContainer>
        </>
      ) : null}
    </ManagementPageShell>
  );
}
