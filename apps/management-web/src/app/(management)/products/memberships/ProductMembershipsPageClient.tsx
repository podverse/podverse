'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FaPenToSquare } from 'react-icons/fa6';

import type { BillingCadence, ResolvedProductMembership } from '@podverse/helpers';
import {
  Alert,
  Breadcrumbs,
  DescriptionList,
  DescriptionListRow,
  EditValueModal,
  IconButton,
  ManagementPageShell,
  SectionHeading,
  Table,
  TableWithFilter,
  useTableFilterState,
} from '@podverse/ui';

import { ManagementLoadingSpinnerOverlay } from '../../../../components/LoadingSpinner/ManagementLoadingSpinnerOverlay';
import { useManagementTableChrome } from '../../../../components/Table/managementTableChrome';
import { managementSearchParamsObject } from '../../../../lib/managementTableUrl';
import {
  getResolvedProductMembership,
  updateProductMembershipSettings,
} from '../../../../lib/requests/productMembership';
import {
  getActiveProductPricing,
  type ProductPricingRow,
  scheduleProductPricing,
} from '../../../../lib/requests/productPricing';
import { ROUTES } from '../../../../lib/routes';
import { resolveManagementTableEmptyState } from '../../../../lib/tableEmptyState';

import dataSurfaceBusyStyles from '../../../../styles/managementDataSurfaceBusy.module.scss';
import styles from './ProductMembershipsPageClient.module.scss';

const PRICING_COLUMN_IDS = [
  'billing_cadence',
  'amount_cents',
  'currency_code',
  'effective_from',
  'source',
] as const;

const MIN_FREE_TRIAL_EXPIRATION_SECONDS = 60;
const MAX_FREE_TRIAL_EXPIRATION_SECONDS = 31536000;

const PRICE_USD_MIN_EXCLUSIVE = 0;
const PRICE_USD_MAX = 999_999.99;

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

type EditingFieldKey = (typeof FIELD_ORDER)[number];

export function ProductMembershipsPageClient() {
  const t = useTranslations('productMemberships');
  const tt = useTranslations('tableShared');
  const tc = useTranslations('common');
  const tNav = useTranslations('nav');
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
  const [editingField, setEditingField] = useState<EditingFieldKey | null>(null);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
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

  const reloadMembershipAndPricing = useCallback(async () => {
    const [resolvedRes, pricingRes] = await Promise.all([
      getResolvedProductMembership(),
      getActiveProductPricing(),
    ]);
    setData(resolvedRes.data);
    setPricingRows(pricingRes.data);
  }, []);

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

  const closeModal = useCallback(() => {
    setEditingField(null);
    setModalError(null);
  }, []);

  const handleModalSubmit = useCallback(
    async (raw: string) => {
      if (data === null || editingField === null) {
        return;
      }
      setModalError(null);
      setSaveSuccess(null);
      setModalSaving(true);

      try {
        if (editingField === 'freeTrialExpirationSeconds') {
          const parsedSeconds = Number.parseInt(raw, 10);
          if (
            !Number.isInteger(parsedSeconds) ||
            parsedSeconds < MIN_FREE_TRIAL_EXPIRATION_SECONDS ||
            parsedSeconds > MAX_FREE_TRIAL_EXPIRATION_SECONDS
          ) {
            setModalError(t('validation.invalidFreeTrialSeconds'));
            return;
          }
          const response = await updateProductMembershipSettings({
            freeTrialExpirationSeconds: parsedSeconds,
          });
          setData(response.data);
          setSaveSuccess(t('saveSuccess'));
          closeModal();
          return;
        }

        if (
          editingField === 'trialMaxAddByRSSFeeds' ||
          editingField === 'trialMaxManualRefreshesPerHour' ||
          editingField === 'premiumMaxAddByRSSFeeds' ||
          editingField === 'premiumMaxManualRefreshesPerHour'
        ) {
          const parsed = Number.parseInt(raw, 10);
          if (!Number.isInteger(parsed) || parsed < 0) {
            setModalError(t('validation.invalidNonNegativeInteger'));
            return;
          }
          let response: Awaited<ReturnType<typeof updateProductMembershipSettings>>;
          if (editingField === 'trialMaxAddByRSSFeeds') {
            response = await updateProductMembershipSettings({ trialMaxAddByRSSFeeds: parsed });
          } else if (editingField === 'trialMaxManualRefreshesPerHour') {
            response = await updateProductMembershipSettings({
              trialMaxManualRefreshesPerHour: parsed,
            });
          } else if (editingField === 'premiumMaxAddByRSSFeeds') {
            response = await updateProductMembershipSettings({ premiumMaxAddByRSSFeeds: parsed });
          } else {
            response = await updateProductMembershipSettings({
              premiumMaxManualRefreshesPerHour: parsed,
            });
          }
          setData(response.data);
          setSaveSuccess(t('saveSuccess'));
          closeModal();
          return;
        }

        if (
          editingField === 'premiumMembershipCostMonthly' ||
          editingField === 'premiumMembershipCostAnnually'
        ) {
          const parsed = Number.parseFloat(raw);
          if (
            !Number.isFinite(parsed) ||
            parsed <= PRICE_USD_MIN_EXCLUSIVE ||
            parsed > PRICE_USD_MAX
          ) {
            setModalError(t('validation.invalidPriceUsd'));
            return;
          }
          const amountCents = Math.round(parsed * 100);
          const cadence: BillingCadence =
            editingField === 'premiumMembershipCostMonthly' ? 'monthly' : 'annual';
          await scheduleProductPricing({
            cadence,
            amountCents,
            changeReason: t('pricingChangeReason'),
          });
          await reloadMembershipAndPricing();
          setSaveSuccess(t('saveSuccess'));
          closeModal();
          return;
        }
      } catch {
        setModalError(t('saveError'));
      } finally {
        setModalSaving(false);
      }
    },
    [closeModal, data, editingField, reloadMembershipAndPricing, t]
  );

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

  const pricingTableEmptyState = resolveManagementTableEmptyState({
    filteredEmptyMessage: tt('noResults'),
    hasDataInSystem: pricingRows.length > 0,
    hasVisibleRows: displayedRows.length > 0,
    systemEmptyMessage: chrome.systemEmptyMessage,
  });

  const modalStep =
    editingField === 'premiumMembershipCostMonthly' ||
    editingField === 'premiumMembershipCostAnnually'
      ? 0.01
      : 1;

  const modalMin =
    editingField === 'freeTrialExpirationSeconds'
      ? MIN_FREE_TRIAL_EXPIRATION_SECONDS
      : editingField === 'premiumMembershipCostMonthly' ||
          editingField === 'premiumMembershipCostAnnually'
        ? undefined
        : 0;

  const modalMax =
    editingField === 'freeTrialExpirationSeconds'
      ? MAX_FREE_TRIAL_EXPIRATION_SECONDS
      : editingField === 'premiumMembershipCostMonthly' ||
          editingField === 'premiumMembershipCostAnnually'
        ? undefined
        : undefined;

  const initialModalValue =
    data !== null && editingField !== null ? String(data[editingField]) : '';

  return (
    <ManagementPageShell
      headerBreadcrumbs={
        <Breadcrumbs
          LinkComponent={Link}
          navAriaLabel={tc('breadcrumbNav')}
          items={[
            { href: ROUTES.DASHBOARD, label: tNav('dashboard') },
            { href: ROUTES.PRODUCTS, label: t('breadcrumbProducts') },
            { label: t('pageTitle') },
          ]}
        />
      }
      subtitle={t('pageSubtitle')}
      title={t('pageTitle')}
    >
      <ManagementLoadingSpinnerOverlay isLoading={loading} />
      {loadError && <p role="alert">{loadError}</p>}
      {!loadError && data !== null && (
        <div
          aria-busy={loading ? true : undefined}
          className={loading ? dataSurfaceBusyStyles.dataSurfaceBusy : undefined}
        >
          {editingField !== null ? (
            <EditValueModal
              cancelLabel={tc('cancel')}
              closeButtonAriaLabel={tc('closeModalAria')}
              emptyValueMessage={t('validation.emptyValue')}
              externalError={modalError}
              initialValue={initialModalValue}
              inputAriaLabel={t(`fieldLabels.${editingField}`)}
              inputEyebrow={t(`fieldLabels.${editingField}`)}
              inputId={`edit-membership-${editingField}`}
              isOpen
              isSaving={modalSaving}
              max={modalMax}
              min={modalMin}
              modalAriaLabel={t('editValueModalAria')}
              numberStepperAriaLabels={{
                decrement: t('numberStepDecrement'),
                increment: t('numberStepIncrement'),
              }}
              saveLabel={tc('saveChanges')}
              step={modalStep}
              title={t('editModalTitle', { label: t(`fieldLabels.${editingField}`) })}
              type="number"
              onClose={closeModal}
              onSubmit={handleModalSubmit}
            />
          ) : null}
          {saveSuccess !== null && <Alert variant="success">{saveSuccess}</Alert>}
          <DescriptionList variant="rows">
            {FIELD_ORDER.map((key) => {
              const fieldLabel = t(`fieldLabels.${key}`);
              return (
                <DescriptionListRow
                  key={key}
                  detail={
                    <div className={styles.detailWithAction}>
                      <span className={styles.detailValue}>{data[key]}</span>
                      <IconButton
                        appearance="ghost"
                        aria-label={t('editFieldAria', { fieldLabel })}
                        title={t('editFieldAria', { fieldLabel })}
                        onClick={() => {
                          setModalError(null);
                          setEditingField(key);
                        }}
                      >
                        <FaPenToSquare aria-hidden />
                      </IconButton>
                    </div>
                  }
                  term={fieldLabel}
                />
              );
            })}
          </DescriptionList>
          <p>{t('pricingScheduleHint')}</p>
          <SectionHeading level={2}>{t('pricingTable.heading')}</SectionHeading>
          {pricingRows.length === 0 ? (
            <p role="status">{chrome.systemEmptyMessage}</p>
          ) : (
            <TableWithFilter
              columns={columns}
              emptyState={pricingTableEmptyState}
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
        </div>
      )}
    </ManagementPageShell>
  );
}
