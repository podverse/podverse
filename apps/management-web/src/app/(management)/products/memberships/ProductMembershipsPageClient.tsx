'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { FormEventHandler } from 'react';
import { useEffect, useMemo, useState } from 'react';

import type { ResolvedProductMembership } from '@podverse/helpers';
import {
  Alert,
  Breadcrumbs,
  Button,
  DescriptionList,
  DescriptionListRow,
  FormMaxWidth,
  FormPrimaryActions,
  ManagementPageShell,
  SectionHeading,
  StackForm,
  Table,
  TableWithFilter,
  TextInput,
  useTableFilterState,
} from '@podverse/ui';

import { ManagementLoadingSpinnerSmall } from '../../../../components/LoadingSpinner/ManagementLoadingSpinnerSmall';
import { useManagementTableChrome } from '../../../../components/Table/managementTableChrome';
import { managementSearchParamsObject } from '../../../../lib/managementTableUrl';
import {
  getResolvedProductMembership,
  updateProductMembershipTrial,
} from '../../../../lib/requests/productMembership';
import {
  getActiveProductPricing,
  type ProductPricingRow,
} from '../../../../lib/requests/productPricing';

const PRICING_COLUMN_IDS = [
  'billing_cadence',
  'amount_cents',
  'currency_code',
  'effective_from',
  'source',
] as const;

function sortPricingRows(
  rows: ProductPricingRow[],
  sortKey: string,
  order: 'asc' | 'desc'
): ProductPricingRow[] {
  const dir = order === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = a[sortKey as keyof ProductPricingRow];
    const bv = b[sortKey as keyof ProductPricingRow];
    if (sortKey === 'amount_cents') {
      const na = typeof av === 'number' ? av : Number(av);
      const nb = typeof bv === 'number' ? bv : Number(bv);
      if (na !== nb) {
        return na > nb ? dir : -dir;
      }
      return 0;
    }
    return String(av ?? '').localeCompare(String(bv ?? '')) * dir;
  });
}

const FIELD_ORDER: (keyof ResolvedProductMembership)[] = [
  'freeTrialExpirationSeconds',
  'premiumMembershipCostMonthly',
  'premiumMembershipCostAnnually',
  'trialMaxAddByRSSFeeds',
  'trialMaxManualRefreshesPerHour',
  'premiumMaxAddByRSSFeeds',
  'premiumMaxManualRefreshesPerHour',
];

export function ProductMembershipsPageClient() {
  const t = useTranslations('productMemberships');
  const tt = useTranslations('tableShared');
  const tc = useTranslations('common');
  const chrome = useManagementTableChrome();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const basePath = pathname !== null && pathname !== '' ? pathname : '/products/memberships';
  const currentQueryParams = useMemo(
    () => managementSearchParamsObject(searchParams),
    [searchParams]
  );
  const initialSearch = searchParams.get('search') ?? '';

  const [data, setData] = useState<ResolvedProductMembership | null>(null);
  const [pricingRows, setPricingRows] = useState<ProductPricingRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [trialSecondsInput, setTrialSecondsInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const [sortBy, setSortBy] = useState<string>('effective_from');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filter = useTableFilterState({
    allColumnIds: [...PRICING_COLUMN_IDS],
    basePath,
    currentQueryParams,
    initialColumns: [...PRICING_COLUMN_IDS],
    initialSearch,
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [resolvedRes, pricingRes] = await Promise.all([
          getResolvedProductMembership(),
          getActiveProductPricing(),
        ]);
        if (!cancelled) {
          setData(resolvedRes.data);
          setPricingRows(pricingRes.data);
          setTrialSecondsInput(String(resolvedRes.data.freeTrialExpirationSeconds));
        }
      } catch {
        if (!cancelled) {
          setLoadError(t('loadError'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [t]);

  const handleTrialSubmit: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    setSaveError(null);
    setSaveSuccess(null);

    const parsedSeconds = Number.parseInt(trialSecondsInput, 10);
    if (!Number.isInteger(parsedSeconds) || parsedSeconds <= 0) {
      setSaveError(t('validation.invalidFreeTrialSeconds'));
      return;
    }

    setSaving(true);
    try {
      const response = await updateProductMembershipTrial({
        freeTrialExpirationSeconds: parsedSeconds,
      });
      setData(response.data);
      setTrialSecondsInput(String(response.data.freeTrialExpirationSeconds));
      setSaveSuccess(t('saveSuccess'));
    } catch {
      setSaveError(t('saveError'));
    } finally {
      setSaving(false);
    }
  };

  const filteredRows = useMemo(() => {
    let list = [...pricingRows];
    const q = filter.search.trim().toLowerCase();
    if (q !== '') {
      const cols =
        filter.selectedColumnIds.length > 0 ? filter.selectedColumnIds : [...PRICING_COLUMN_IDS];
      list = list.filter((row) =>
        cols.some((col) => {
          const v = row[col as keyof ProductPricingRow];
          return String(v ?? '')
            .toLowerCase()
            .includes(q);
        })
      );
    }
    return list;
  }, [pricingRows, filter.search, filter.selectedColumnIds]);

  const displayedRows = useMemo(
    () => sortPricingRows(filteredRows, sortBy, sortOrder),
    [filteredRows, sortBy, sortOrder]
  );

  const columns = useMemo(
    () => [
      {
        header: t('pricingTable.cadence'),
        id: 'billing_cadence',
        label: t('pricingTable.cadence'),
        sortAriaLabel: chrome.sortAriaForColumn(String(t('pricingTable.cadence'))),
        sortKey: 'billing_cadence',
      },
      {
        header: t('pricingTable.amountCents'),
        id: 'amount_cents',
        label: t('pricingTable.amountCents'),
        sortAriaLabel: chrome.sortAriaForColumn(String(t('pricingTable.amountCents'))),
        sortKey: 'amount_cents',
      },
      {
        header: t('pricingTable.currency'),
        id: 'currency_code',
        label: t('pricingTable.currency'),
        sortAriaLabel: chrome.sortAriaForColumn(String(t('pricingTable.currency'))),
        sortKey: 'currency_code',
      },
      {
        header: t('pricingTable.effectiveFrom'),
        id: 'effective_from',
        label: t('pricingTable.effectiveFrom'),
        sortAriaLabel: chrome.sortAriaForColumn(String(t('pricingTable.effectiveFrom'))),
        sortKey: 'effective_from',
      },
      {
        header: t('pricingTable.source'),
        id: 'source',
        label: t('pricingTable.source'),
        sortAriaLabel: chrome.sortAriaForColumn(String(t('pricingTable.source'))),
        sortKey: 'source',
      },
    ],
    [chrome, t]
  );

  const emptyFiltered =
    pricingRows.length > 0 &&
    displayedRows.length === 0 &&
    (filter.search.trim() !== '' || filter.selectedColumnIds.length < PRICING_COLUMN_IDS.length);

  return (
    <ManagementPageShell
      headerChildren={
        <Breadcrumbs
          LinkComponent={Link}
          marginBottom="lg"
          navAriaLabel={tc('breadcrumbNav')}
          items={[
            { href: '/dashboard', label: t('breadcrumbDashboard') },
            { href: '/products', label: t('breadcrumbProducts') },
            { label: t('pageTitle') },
          ]}
        />
      }
      subtitle={t('pageSubtitle')}
      title={t('pageTitle')}
    >
      {loading && <ManagementLoadingSpinnerSmall />}
      {loadError && <p role="alert">{loadError}</p>}
      {!loading && !loadError && data !== null && (
        <>
          <SectionHeading level={2}>{t('editableTrialHeading')}</SectionHeading>
          <FormMaxWidth>
            <StackForm onSubmit={(event) => void handleTrialSubmit(event)}>
              <TextInput
                id="free-trial-expiration-seconds-input"
                eyebrow={t('fieldLabels.freeTrialExpirationSeconds')}
                min={1}
                type="number"
                value={trialSecondsInput}
                onChange={(event) => setTrialSecondsInput(event.target.value)}
              />
              <FormPrimaryActions>
                <Button type="submit" disabled={saving}>
                  {saving ? tc('saving') : tc('saveChanges')}
                </Button>
              </FormPrimaryActions>
            </StackForm>
          </FormMaxWidth>
          {saveError !== null && <Alert>{saveError}</Alert>}
          {saveSuccess !== null && <Alert variant="success">{saveSuccess}</Alert>}
          <DescriptionList variant="rows">
            {FIELD_ORDER.map((key) => (
              <DescriptionListRow key={key} detail={data[key]} term={t(`fieldLabels.${key}`)} />
            ))}
          </DescriptionList>
          <SectionHeading level={2}>{t('pricingTable.heading')}</SectionHeading>
          {pricingRows.length === 0 ? (
            <p>{tt('noData')}</p>
          ) : (
            <TableWithFilter
              columns={columns}
              emptyMessage={emptyFiltered ? tt('noResults') : undefined}
              filter={filter}
              filterableColumnIds={[...PRICING_COLUMN_IDS]}
              getRowKey={(row) => String(row.id)}
              labels={chrome.filterLabels}
              paginationMode="none"
              renderCells={(row) => (
                <>
                  <Table.Cell>{row.billing_cadence}</Table.Cell>
                  <Table.Cell>{row.amount_cents}</Table.Cell>
                  <Table.Cell>{row.currency_code}</Table.Cell>
                  <Table.Cell>{row.effective_from}</Table.Cell>
                  <Table.Cell>{row.source}</Table.Cell>
                </>
              )}
              rows={displayedRows}
              sortBy={sortBy}
              sortOrder={sortOrder}
              sortableColumnIds={[...PRICING_COLUMN_IDS]}
              onSortChange={(key, order) => {
                setSortBy(key);
                setSortOrder(order);
              }}
            />
          )}
        </>
      )}
    </ManagementPageShell>
  );
}
