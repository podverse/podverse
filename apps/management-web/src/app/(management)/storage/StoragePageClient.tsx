'use client';

import { isAxiosError } from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { formatDateTimeAbbrevOrFallback, formatFileSize } from '@podverse/helpers';
import {
  ActionLink,
  Alert,
  Button,
  Checkbox,
  ConfirmPanel,
  ConfirmPanelActions,
  CursorPagination,
  EllipsisText,
  FormGroup,
  Input,
  Label,
  LoadingText,
  ManagementPageShell,
  StickyBulkActionBar,
  Table,
  useCursorPagination,
} from '@podverse/ui';

import { canDeleteStorage } from '../../../lib/managementPermissions';
import type { CurrentUser } from '../../../lib/requests/auth';
import { getCurrentUser } from '../../../lib/requests/auth';
import type { StorageObjectListItem } from '../../../lib/requests/storage';
import {
  bulkDeleteStorageObjects,
  deleteStorageObject,
  listStorageObjects,
} from '../../../lib/requests/storage';
import { encodeStorageObjectKeyForPathSegment } from '../../../lib/storageObjectPath';

const LIST_MAX_KEYS = 50;

const STORAGE_DISPLAY_FALLBACK = '—';

export type StoragePageClientProps = {
  initialUser: CurrentUser;
};

export function StoragePageClient({ initialUser }: StoragePageClientProps) {
  const [user, setUser] = useState<CurrentUser>(initialUser);
  const [prefixInput, setPrefixInput] = useState('');
  const [debouncedPrefix, setDebouncedPrefix] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());
  const [listError, setListError] = useState<string | null>(null);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [deleteKey, setDeleteKey] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('storage');
  const tc = useTranslations('common');

  const canDelete = useMemo(() => canDeleteStorage(user), [user]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedPrefix(prefixInput);
    }, 300);
    return () => {
      clearTimeout(handle);
    };
  }, [prefixInput]);

  useEffect(() => {
    let cancelled = false;
    const verify = async () => {
      try {
        const current = await getCurrentUser();
        if (cancelled) {
          return;
        }
        if (!current) {
          router.replace('/');
          return;
        }
        setUser(current);
      } catch {
        if (!cancelled) {
          router.replace('/');
        }
      }
    };
    void verify();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const fetchPage = useCallback(
    async (continuationToken: string | undefined) => {
      setListError(null);
      try {
        const res = await listStorageObjects({
          prefix: debouncedPrefix.trim() === '' ? undefined : debouncedPrefix,
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
    [debouncedPrefix, t]
  );

  const pagination = useCursorPagination({ fetchPage });

  useEffect(() => {
    void pagination.reset();
  }, [debouncedPrefix, pagination.reset]);

  useEffect(() => {
    setSelectedKeys(new Set());
  }, [debouncedPrefix]);

  const allOnPageSelected =
    pagination.items.length > 0 && pagination.items.every((row) => selectedKeys.has(row.key));

  const toggleSelectAllOnPage = () => {
    if (pagination.items.length === 0) {
      return;
    }
    if (allOnPageSelected) {
      setSelectedKeys((prev) => {
        const next = new Set(prev);
        for (const row of pagination.items) {
          next.delete(row.key);
        }
        return next;
      });
      return;
    }
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      for (const row of pagination.items) {
        next.add(row.key);
      }
      return next;
    });
  };

  const toggleRow = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const runBulkDelete = async () => {
    const keys = [...selectedKeys];
    if (keys.length === 0) {
      return;
    }
    setActionLoading(true);
    try {
      await bulkDeleteStorageObjects(keys);
      setBulkConfirmOpen(false);
      setSelectedKeys(new Set());
      await pagination.reset();
    } catch {
      setListError(t('bulkDeleteError'));
    } finally {
      setActionLoading(false);
    }
  };

  const runSingleDelete = async (key: string) => {
    setActionLoading(true);
    try {
      await deleteStorageObject(key);
      setDeleteKey(null);
      await pagination.refetch();
    } catch {
      setListError(t('deleteError'));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <ManagementPageShell subtitle={t('subtitle')} title={t('title')}>
      {listError !== null ? <Alert variant="error">{listError}</Alert> : null}

      <FormGroup>
        <Label htmlFor="storage-prefix-filter">{t('prefixFilter')}</Label>
        <Input
          id="storage-prefix-filter"
          name="storage-prefix-filter"
          value={prefixInput}
          onChange={(e) => {
            setPrefixInput(e.target.value);
          }}
          placeholder={t('prefixPlaceholder')}
          type="text"
        />
      </FormGroup>

      {pagination.isLoading && pagination.items.length === 0 ? (
        <LoadingText>{t('loading')}</LoadingText>
      ) : pagination.items.length === 0 ? (
        <p>{t('empty')}</p>
      ) : (
        <>
          <Table.ScrollContainer>
            <Table>
              <Table.Head>
                <Table.Row>
                  {canDelete ? (
                    <Table.SelectHeaderCell>
                      <Checkbox
                        aria-label={t('selectAllAria')}
                        checked={allOnPageSelected}
                        onChange={toggleSelectAllOnPage}
                      />
                    </Table.SelectHeaderCell>
                  ) : (
                    <Table.SelectHeaderCell> </Table.SelectHeaderCell>
                  )}
                  <Table.HeaderCell>{t('table.key')}</Table.HeaderCell>
                  <Table.HeaderCell>{t('table.size')}</Table.HeaderCell>
                  <Table.HeaderCell>{t('table.lastModified')}</Table.HeaderCell>
                  <Table.HeaderCell>{t('table.actions')}</Table.HeaderCell>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {pagination.items.map((row) => (
                  <Table.Row key={row.key}>
                    {canDelete ? (
                      <Table.SelectCell>
                        <Checkbox
                          aria-label={t('selectRowAria', { key: row.key })}
                          checked={selectedKeys.has(row.key)}
                          onChange={() => {
                            toggleRow(row.key);
                          }}
                        />
                      </Table.SelectCell>
                    ) : (
                      <Table.SelectCell />
                    )}
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
                    <Table.Cell>
                      <Table.RowActions>
                        <ActionLink
                          href={`/storage/${encodeStorageObjectKeyForPathSegment(row.key)}`}
                          LinkComponent={Link}
                          variant="subtle"
                        >
                          {t('view')}
                        </ActionLink>
                        {canDelete ? (
                          <Button
                            onClick={() => {
                              setDeleteKey(row.key);
                            }}
                            type="button"
                            variant="secondary"
                          >
                            {t('delete')}
                          </Button>
                        ) : null}
                      </Table.RowActions>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </Table.ScrollContainer>

          {canDelete && selectedKeys.size > 0 ? (
            <StickyBulkActionBar>
              <span>{t('selectedCount', { count: selectedKeys.size })}</span>
              <Button
                disabled={actionLoading}
                onClick={() => {
                  setBulkConfirmOpen(true);
                }}
                type="button"
                variant="primary"
              >
                {t('bulkDelete')}
              </Button>
            </StickyBulkActionBar>
          ) : null}
        </>
      )}

      <CursorPagination
        hasNext={pagination.hasNext}
        hasPrev={pagination.hasPrev}
        isLoading={pagination.isLoading}
        nextLabel={t('paginationNext')}
        onNext={pagination.goNext}
        onPrev={pagination.goPrev}
        pageLabel={t('paginationPage', { page: pagination.pageNumber })}
        prevLabel={t('paginationPrev')}
      />

      {bulkConfirmOpen ? (
        <div role="dialog" aria-label={t('bulkConfirmAria')}>
          <ConfirmPanel>
            <p>{t('bulkConfirmBody', { count: selectedKeys.size })}</p>
            <ConfirmPanelActions>
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
                disabled={actionLoading}
                onClick={() => void runBulkDelete()}
                type="button"
                variant="primary"
              >
                {actionLoading ? t('deleting') : tc('confirm')}
              </Button>
            </ConfirmPanelActions>
          </ConfirmPanel>
        </div>
      ) : null}

      {deleteKey !== null ? (
        <div role="dialog" aria-label={t('deleteConfirmAria')}>
          <ConfirmPanel>
            <p>{t('deleteConfirmBody', { key: deleteKey })}</p>
            <ConfirmPanelActions>
              <Button
                onClick={() => {
                  setDeleteKey(null);
                }}
                type="button"
                variant="secondary"
              >
                {tc('cancel')}
              </Button>
              <Button
                disabled={actionLoading}
                onClick={() => {
                  void runSingleDelete(deleteKey);
                }}
                type="button"
                variant="primary"
              >
                {actionLoading ? t('deleting') : tc('confirm')}
              </Button>
            </ConfirmPanelActions>
          </ConfirmPanel>
        </div>
      ) : null}
    </ManagementPageShell>
  );
}
