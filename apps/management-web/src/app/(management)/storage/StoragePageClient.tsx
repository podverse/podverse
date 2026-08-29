'use client';

import { isAxiosError } from 'axios';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { formatDateTimeAbbrevOrFallback, formatFileSize } from '@podverse/helpers';
import {
  Alert,
  Breadcrumbs,
  Button,
  EllipsisText,
  ManagementPageShell,
  Modal,
  ModalActions,
  MoreButton,
  ResourceTableWithFilter,
  Table,
  useCursorPagination,
} from '@podverse/ui';

import { ManagementLoadingSpinnerOverlayStatus } from '../../../components/LoadingSpinner/ManagementLoadingSpinnerOverlay';
import { ManagementProbeChromeGate } from '../../../components/ManagementProbeChromeGate/ManagementProbeChromeGate';
import { useManagementTableChrome } from '../../../components/Table/managementTableChrome';
import { useManagementClientSessionGuard } from '../../../hooks/useManagementClientSessionGuard';
import { ManagementIconButtonLink } from '../../../lib/ManagementIconButtonLink';
import { canDeleteStorage } from '../../../lib/managementPermissions';
import { managementSearchParamsObject } from '../../../lib/managementTableUrl';
import type { CurrentUser } from '../../../lib/requests/auth';
import type { StorageObjectListItem } from '../../../lib/requests/storage';
import {
  bulkDeleteStorageObjects,
  countStorageObjectsByPrefix,
  deleteAllStorageObjectsByPrefix,
  deleteStorageObject,
  listStorageObjects,
  probeStorageBucketHasObjects,
} from '../../../lib/requests/storage';
import { buildStorageObjectPath, ROUTES } from '../../../lib/routes';
import { resolveManagementTableEmptyState } from '../../../lib/tableEmptyState';

const LIST_MAX_KEYS = 50;

const STORAGE_DISPLAY_FALLBACK = '—';

const STORAGE_COLUMN_IDS = ['key', 'size', 'lastModified'] as const;

export type StoragePageClientProps = {
  initialUser: CurrentUser;
};

export function StoragePageClient({ initialUser }: StoragePageClientProps) {
  const user = useManagementClientSessionGuard(initialUser);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations('storage');
  const tc = useTranslations('common');
  const tsTable = useTranslations('tableShared');
  const tNav = useTranslations('nav');
  const chrome = useManagementTableChrome();

  const basePath = pathname !== null && pathname !== '' ? pathname : ROUTES.STORAGE;
  const currentQueryParams = useMemo(
    () => managementSearchParamsObject(searchParams),
    [searchParams]
  );
  const initialSearch = searchParams.get('search') ?? '';
  const prefixForFetch = initialSearch;

  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteAllConfirmOpen, setDeleteAllConfirmOpen] = useState(false);
  const [deleteAllCount, setDeleteAllCount] = useState<{ count: number; exact: boolean } | null>(
    null
  );
  const [deleteAllCounting, setDeleteAllCounting] = useState(false);
  const [deleteAllBusy, setDeleteAllBusy] = useState(false);

  const canDelete = useMemo(() => canDeleteStorage(user), [user]);

  const fetchPage = useCallback(
    async (continuationToken: string | undefined) => {
      setListError(null);
      try {
        const trimmed = prefixForFetch.trim();
        const res = await listStorageObjects({
          prefix: trimmed === '' ? undefined : trimmed,
          continuationToken,
          maxKeys: LIST_MAX_KEYS,
        });
        return {
          items: res.objects,
          nextContinuationToken: res.nextContinuationToken ?? undefined,
        };
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 404) {
          setListError(t('featureDisabled'));
        } else {
          setListError(t('listLoadError'));
        }
        return { items: [] as StorageObjectListItem[], nextContinuationToken: undefined };
      }
    },
    [prefixForFetch, t]
  );

  const pagination = useCursorPagination({ fetchPage });

  const [bucketHasObjectsProbe, setBucketHasObjectsProbe] = useState<boolean | undefined>(
    undefined
  );

  useEffect(() => {
    void pagination.reset();
  }, [prefixForFetch, pagination.reset]);

  useEffect(() => {
    setBucketHasObjectsProbe(undefined);
  }, [prefixForFetch]);

  useEffect(() => {
    setSelectedKeys([]);
  }, [pagination.pageNumber]);

  useEffect(() => {
    if (!deleteAllConfirmOpen) {
      return;
    }
    let cancelled = false;
    setDeleteAllCount(null);
    setDeleteAllCounting(true);
    const prefix = prefixForFetch.trim();
    void (async () => {
      try {
        const res = await countStorageObjectsByPrefix(prefix);
        if (!cancelled) {
          setDeleteAllCount(res);
        }
      } catch {
        if (!cancelled) {
          setListError(t('deleteAllError'));
          setDeleteAllConfirmOpen(false);
        }
      } finally {
        if (!cancelled) {
          setDeleteAllCounting(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [deleteAllConfirmOpen, prefixForFetch, t]);

  const runBulkDelete = async () => {
    if (selectedKeys.length === 0) {
      return;
    }
    setActionLoading(true);
    try {
      await bulkDeleteStorageObjects(selectedKeys);
      setBulkConfirmOpen(false);
      setSelectedKeys([]);
      await pagination.reset();
    } catch {
      setListError(t('bulkDeleteError'));
    } finally {
      setActionLoading(false);
    }
  };

  const runDeleteAllByPrefix = async () => {
    setDeleteAllBusy(true);
    try {
      const prefix = prefixForFetch.trim();
      const outcome = await deleteAllStorageObjectsByPrefix(prefix);
      if (outcome.failed.length > 0) {
        setListError(
          t('deleteAllPartialError', {
            deleted: outcome.deleted,
            requested: outcome.requested,
            failed: outcome.failed.length,
          })
        );
      }
      setDeleteAllConfirmOpen(false);
      setDeleteAllCount(null);
      setSelectedKeys([]);
      await pagination.reset();
    } catch {
      setListError(t('deleteAllError'));
    } finally {
      setDeleteAllBusy(false);
    }
  };

  const closeDeleteAllModal = () => {
    setDeleteAllConfirmOpen(false);
    setDeleteAllCount(null);
  };

  const debouncedPrefixTrimmed = prefixForFetch.trim();
  const deleteAllCountValue = deleteAllCount?.count ?? 0;

  const columns = useMemo(
    () => [
      {
        header: t('table.key'),
        id: 'key',
        label: t('table.key'),
        sortable: false,
        sortKey: 'key',
      },
      {
        header: t('table.size'),
        id: 'size',
        label: t('table.size'),
        sortable: false,
        sortKey: 'size',
      },
      {
        header: t('table.lastModified'),
        id: 'lastModified',
        label: t('table.lastModified'),
        sortable: false,
        sortKey: 'lastModified',
      },
    ],
    [t]
  );

  const noopSort = useCallback(() => {}, []);

  const showInitialSpinner = pagination.isLoading && pagination.items.length === 0;

  useEffect(() => {
    if (showInitialSpinner) {
      return;
    }
    if (pagination.items.length > 0) {
      setBucketHasObjectsProbe(true);
      return;
    }
    let cancelled = false;
    void probeStorageBucketHasObjects().then((has) => {
      if (!cancelled) {
        setBucketHasObjectsProbe(has);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [prefixForFetch, pagination.items.length, showInitialSpinner]);

  const probingBucketExistence =
    !showInitialSpinner && pagination.items.length === 0 && bucketHasObjectsProbe === undefined;

  const storageTableEmptyState = resolveManagementTableEmptyState({
    filteredEmptyMessage: t('empty'),
    hasDataInSystem: bucketHasObjectsProbe,
    hasVisibleRows: pagination.items.length > 0,
    systemEmptyMessage: chrome.systemEmptyMessage,
  });

  const deleteAllOverlayMessage = deleteAllBusy ? t('deleteAllInProgress') : t('deleteAllCounting');

  return (
    <ManagementPageShell
      headerBreadcrumbs={
        <Breadcrumbs
          LinkComponent={Link}
          navAriaLabel={tc('breadcrumbNav')}
          items={[{ href: ROUTES.DASHBOARD, label: tNav('dashboard') }, { label: t('title') }]}
        />
      }
      subtitle={t('subtitle')}
      title={t('title')}
    >
      <ManagementLoadingSpinnerOverlayStatus
        isLoading={deleteAllCounting || deleteAllBusy}
        message={deleteAllOverlayMessage}
      />
      <Alert>{listError}</Alert>

      {!listError && (
        <ManagementProbeChromeGate
          bypassWhileError={false}
          loading={showInitialSpinner}
          probingExistence={probingBucketExistence}
        >
          <ResourceTableWithFilter<StorageObjectListItem>
            actions={
              canDelete
                ? {
                    LinkComponent: ManagementIconButtonLink,
                    labels: {
                      delete: tc('delete'),
                      edit: tc('edit'),
                      view: t('view'),
                    },
                    onDelete: async (row) => {
                      await deleteStorageObject(row.key);
                      await pagination.refetch();
                    },
                    viewHref: (row) => buildStorageObjectPath(row.key),
                  }
                : {
                    LinkComponent: ManagementIconButtonLink,
                    labels: {
                      delete: tc('delete'),
                      edit: tc('edit'),
                      view: t('view'),
                    },
                    viewHref: (row) => buildStorageObjectPath(row.key),
                  }
            }
            allColumnIds={[...STORAGE_COLUMN_IDS]}
            basePath={basePath}
            bulkSelect={
              canDelete
                ? {
                    ariaLabels: chrome.bulkAria,
                    onSelectionChange: setSelectedKeys,
                    selectedKeys,
                    toolbarActions: [
                      {
                        label: t('bulkDelete'),
                        onClick: () => {
                          setBulkConfirmOpen(true);
                        },
                        variant: 'danger',
                      },
                    ],
                    toolbarClearLabel: tsTable('bulk.clearSelection'),
                    toolbarSelectedSummary: t('selectedCount', { count: selectedKeys.length }),
                  }
                : undefined
            }
            columns={columns}
            currentQueryParams={currentQueryParams}
            cursorPagination={{
              hasNext: pagination.hasNext,
              hasPrev: pagination.hasPrev,
              isLoading: pagination.isLoading,
              nextLabel: t('paginationNext'),
              onNext: pagination.goNext,
              onPrev: pagination.goPrev,
              pageLabel: t('paginationPage', { page: pagination.pageNumber }),
              prevLabel: t('paginationPrev'),
            }}
            deleteConfirm={{
              ...chrome.deleteConfirmLabels,
              message: (row) => t('deleteConfirmBody', { key: row.key }),
              modalAriaLabel: t('deleteConfirmAria'),
            }}
            emptyState={storageTableEmptyState}
            filterableColumnIds={[...STORAGE_COLUMN_IDS]}
            getRowActions={
              canDelete
                ? undefined
                : () => ({
                    delete: 'hidden',
                    edit: 'hidden',
                    view: 'enabled',
                  })
            }
            getRowKey={(row) => row.key}
            initialColumns={[...STORAGE_COLUMN_IDS]}
            initialSearch={initialSearch}
            labels={{
              ...chrome.filterLabels,
              actionsColumn: t('table.actions'),
              searchPlaceholder: t('prefixPlaceholder'),
            }}
            paginationMode="cursor"
            renderCells={(row) => (
              <>
                <Table.Cell style={{ minWidth: 0, maxWidth: '28rem' }}>
                  <EllipsisText maxWidth="28rem" title={row.key}>
                    {row.key}
                  </EllipsisText>
                </Table.Cell>
                <Table.Cell>
                  {formatFileSize(row.size, { zeroLabel: '0 B' }) ?? STORAGE_DISPLAY_FALLBACK}
                </Table.Cell>
                <Table.Cell>
                  {formatDateTimeAbbrevOrFallback(
                    row.lastModified,
                    locale,
                    STORAGE_DISPLAY_FALLBACK
                  )}
                </Table.Cell>
              </>
            )}
            rows={pagination.items}
            sortBy="key"
            sortOrder="asc"
            sortableColumnIds={[]}
            onSortChange={noopSort}
            trailingToolbar={
              canDelete ? (
                <MoreButton
                  ariaLabel={t('moreAria')}
                  moreButtonMenuItems={[
                    {
                      label: t('deleteAll'),
                      onClick: () => {
                        setDeleteAllConfirmOpen(true);
                      },
                      variant: 'danger',
                    },
                  ]}
                />
              ) : null
            }
          />
        </ManagementProbeChromeGate>
      )}

      <Modal
        ariaLabel={t('bulkConfirmAria')}
        closeButtonAriaLabel={tc('closeModalAria')}
        isOpen={bulkConfirmOpen}
        onClose={() => {
          setBulkConfirmOpen(false);
        }}
      >
        <p>{t('bulkConfirmBody', { count: selectedKeys.length })}</p>
        <ModalActions>
          <Button
            onClick={() => {
              setBulkConfirmOpen(false);
            }}
            type="button"
            variant="secondary"
          >
            {tc('cancel')}
          </Button>
          <Button
            isLoading={actionLoading}
            onClick={() => void runBulkDelete()}
            type="button"
            variant="primary"
          >
            {tc('confirm')}
          </Button>
        </ModalActions>
      </Modal>

      <Modal
        ariaLabel={t('deleteAllConfirmAria')}
        closeButtonAriaLabel={tc('closeModalAria')}
        isOpen={deleteAllConfirmOpen}
        onClose={closeDeleteAllModal}
      >
        <h2>{t('deleteAllConfirmTitle')}</h2>
        <p>
          {debouncedPrefixTrimmed === ''
            ? t('deleteAllConfirmBodyEmptyPrefix')
            : t('deleteAllConfirmBodyWithPrefix', { prefix: debouncedPrefixTrimmed })}
        </p>
        <p>{t('deleteAllIrreversible')}</p>
        <p>
          {!deleteAllCounting && !deleteAllBusy && deleteAllCount !== null
            ? deleteAllCount.exact
              ? t('deleteAllCount', { count: deleteAllCount.count })
              : t('deleteAllCountTruncated', { count: deleteAllCount.count })
            : null}
        </p>
        <ModalActions>
          <Button
            disabled={deleteAllBusy}
            onClick={closeDeleteAllModal}
            type="button"
            variant="secondary"
          >
            {tc('cancel')}
          </Button>
          <Button
            disabled={
              deleteAllCounting ||
              deleteAllBusy ||
              deleteAllCount === null ||
              deleteAllCountValue === 0
            }
            isLoading={deleteAllBusy}
            onClick={() => void runDeleteAllByPrefix()}
            type="button"
            variant="primary"
          >
            {tc('confirm')}
          </Button>
        </ModalActions>
      </Modal>
    </ManagementPageShell>
  );
}
