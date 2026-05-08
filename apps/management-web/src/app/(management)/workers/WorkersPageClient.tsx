'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FaArrowUpRightFromSquare } from 'react-icons/fa6';

import type { SortDirection, StatusBadgeVariant } from '@podverse/ui';
import {
  Alert,
  CodeText,
  CopyToClipboardButton,
  Disclosure,
  FormHintText,
  LeadParagraph,
  LoadingSpinner,
  ManagementPageShell,
  RestrictedNotice,
  StatusBadge,
  Table,
  TableFilterBar,
  TableWithSort,
  useTableFilterState,
} from '@podverse/ui';

import { useManagementTableChrome } from '../../../components/Table/managementTableChrome';
import { ManagementIconButtonLink } from '../../../lib/ManagementIconButtonLink';
import { managementSearchParamsObject } from '../../../lib/managementTableUrl';
import type { CurrentUser } from '../../../lib/requests/auth';
import { getCurrentUser } from '../../../lib/requests/auth';
import { listWorkerCommands, type WorkerCommandRow } from '../../../lib/requests/workerCommands';

import styles from './WorkersPageClient.module.scss';

const CATEGORY_KEY: Record<string, string> = {
  archival: 'categories.archival',
  on_demand_parser: 'categories.on_demand_parser',
  image: 'categories.image',
  mq: 'categories.mq',
  orm: 'categories.orm',
  parser: 'categories.parser',
  podcast_index: 'categories.podcast_index',
  stats: 'categories.stats',
  dev: 'categories.dev',
};

const RISK_KEY: Record<string, string> = {
  normal: 'riskLabels.normal',
  long_running: 'riskLabels.long_running',
  dev_only: 'riskLabels.dev_only',
};

const WORKER_COLUMN_IDS = ['command', 'description', 'risk', 'actions'] as const;

type WorkersPageClientProps = {
  initialUser: CurrentUser;
};

function riskVariant(risk: WorkerCommandRow['risk']): StatusBadgeVariant {
  if (risk === 'long_running') {
    return 'warning';
  }
  if (risk === 'dev_only') {
    return 'danger';
  }
  return 'neutral';
}

export function WorkersPageClient({ initialUser }: WorkersPageClientProps) {
  const [user, setUser] = useState<CurrentUser>(initialUser);
  const [commands, setCommands] = useState<WorkerCommandRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('workers');
  const tc = useTranslations('common');
  const chrome = useManagementTableChrome();

  const basePath = pathname !== null && pathname !== '' ? pathname : '/workers';
  const currentQueryParams = useMemo(
    () => managementSearchParamsObject(searchParams),
    [searchParams]
  );
  const urlSearch = searchParams.get('search') ?? '';

  const filter = useTableFilterState({
    allColumnIds: [...WORKER_COLUMN_IDS],
    basePath,
    currentQueryParams,
    initialColumns: [...WORKER_COLUMN_IDS],
    initialSearch: urlSearch,
  });

  const getCategoryLabel = useCallback(
    (category: string): string => {
      const key = CATEGORY_KEY[category];
      return key ? t(key) : category;
    },
    [t]
  );

  const getRiskLabel = useCallback(
    (risk: string): string => {
      const key = RISK_KEY[risk];
      return key ? t(key) : risk;
    },
    [t]
  );

  const matchesQuery = useCallback(
    (row: WorkerCommandRow, q: string): boolean => {
      if (!q.trim()) {
        return true;
      }
      const s = q.trim().toLowerCase();
      const categoryLabel = getCategoryLabel(row.category).toLowerCase();
      return (
        row.name.toLowerCase().includes(s) ||
        row.label.toLowerCase().includes(s) ||
        row.description.toLowerCase().includes(s) ||
        row.category.toLowerCase().includes(s) ||
        categoryLabel.includes(s)
      );
    },
    [getCategoryLabel]
  );

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

  const isSuperuser = user.role === 'superuser';

  useEffect(() => {
    if (!isSuperuser) {
      setCommands(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    const run = async () => {
      try {
        const res = await listWorkerCommands();
        if (!cancelled) {
          setCommands(res.commands);
        }
      } catch {
        if (!cancelled) {
          setLoadError(t('failedToLoad'));
          setCommands(null);
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
  }, [isSuperuser, t]);

  const filteredRows = useMemo(() => {
    if (!commands) {
      return [];
    }
    return commands.filter((r) => matchesQuery(r, filter.search));
  }, [commands, filter.search, matchesQuery]);

  const commandGroups = useMemo(() => {
    const byCategory = new Map<string, WorkerCommandRow[]>();
    for (const row of filteredRows) {
      const list = byCategory.get(row.category) ?? [];
      list.push(row);
      byCategory.set(row.category, list);
    }
    const categories = Array.from(byCategory.keys()).sort((a, b) =>
      getCategoryLabel(a).localeCompare(getCategoryLabel(b), undefined, { sensitivity: 'base' })
    );
    return categories.map((category) => ({
      category,
      rows: byCategory.get(category) ?? [],
    }));
  }, [filteredRows, getCategoryLabel]);

  const filterBarColumns = useMemo(
    () => [
      { id: 'command', label: t('tableHeaders.command') },
      { id: 'description', label: t('tableHeaders.description') },
      { id: 'risk', label: t('tableHeaders.risk') },
      { id: 'actions', label: tc('actions') },
    ],
    [t, tc]
  );

  const sortColumns = useMemo(
    () => [
      {
        header: t('tableHeaders.command'),
        key: 'command',
        sortable: false,
      },
      {
        header: t('tableHeaders.description'),
        key: 'description',
        sortable: false,
      },
      {
        header: t('tableHeaders.risk'),
        key: 'risk',
        sortable: false,
      },
      {
        header: tc('actions'),
        key: 'actions',
        sortable: false,
      },
    ],
    [t, tc]
  );

  const noopSort = useCallback((_sortKey: string, _order: SortDirection) => {
    // Workers catalog has no sortable columns (tables convergence phase 06).
  }, []);

  const groupedEmpty = filteredRows.length === 0;

  return (
    <ManagementPageShell title={t('title')}>
      <LeadParagraph>
        {t.rich('intro', {
          code: (chunks) => <code>{chunks}</code>,
        })}
      </LeadParagraph>
      {!isSuperuser && (
        <RestrictedNotice title={t('superuserOnly')}>
          <p>
            {t.rich('superuserOnlyDescription', {
              code: (chunks) => <code>{chunks}</code>,
            })}
          </p>
        </RestrictedNotice>
      )}

      {isSuperuser && loading && <LoadingSpinner ariaLabel={t('loadingCommands')} size="small" />}
      {isSuperuser && !loading && loadError && <Alert>{loadError}</Alert>}

      {isSuperuser && !loading && !loadError && commands && (
        <div className={styles.root}>
          <div className={styles.filterRow}>
            <div className={styles.filterBar}>
              <TableFilterBar
                columns={filterBarColumns}
                filterColumnsLabel={chrome.filterLabels.filterColumnsLabel}
                funnelAriaLabel={chrome.filterLabels.funnelAriaLabel}
                searchPlaceholder={t('searchPlaceholder')}
                searchValue={filter.search}
                selectedColumnIds={filter.selectedColumnIds}
                onSearchChange={filter.setSearch}
                onSelectedColumnIdsChange={filter.handleColumnSelectionChange}
              />
            </div>
          </div>

          <FormHintText variant="block">
            {t('commandCount', { shown: filteredRows.length, total: commands.length })}
          </FormHintText>

          {groupedEmpty ? (
            <p className={styles.emptyMessage}>{t('noMatchingCommands')}</p>
          ) : (
            commandGroups.map(({ category, rows: groupRows }) => (
              <Disclosure key={category} title={getCategoryLabel(category)}>
                <Table.ScrollContainer>
                  <TableWithSort
                    columns={sortColumns}
                    sortBy={undefined}
                    sortOrder="asc"
                    onSortChange={noopSort}
                  >
                    <Table.Body>
                      {groupRows.map((row) => (
                        <Table.Row key={row.name}>
                          <Table.Cell>
                            <CodeText>{row.name}</CodeText>
                            <div>{row.label}</div>
                          </Table.Cell>
                          <Table.Cell>{row.description}</Table.Cell>
                          <Table.Cell>
                            <StatusBadge variant={riskVariant(row.risk)}>
                              {getRiskLabel(row.risk)}
                            </StatusBadge>
                          </Table.Cell>
                          <Table.Cell>
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 'var(--spacing-md)',
                                alignItems: 'flex-start',
                              }}
                            >
                              <CopyToClipboardButton
                                copiedLabel={t('copiedToClipboard')}
                                errorLabel={t('copyFailed')}
                                idleLabel={t('copyExample')}
                                textToCopy={row.example_cli}
                              />
                              {row.related_management_path ? (
                                <Table.RowActions>
                                  <Table.IconActionLink
                                    LinkComponent={ManagementIconButtonLink}
                                    ariaLabel={t('openRelatedTool')}
                                    href={row.related_management_path}
                                    title={t('openRelatedTool')}
                                  >
                                    <FaArrowUpRightFromSquare aria-hidden />
                                  </Table.IconActionLink>
                                </Table.RowActions>
                              ) : null}
                              <CodeText variant="block">{row.example_cli}</CodeText>
                            </div>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </TableWithSort>
                </Table.ScrollContainer>
              </Disclosure>
            ))
          )}
        </div>
      )}
    </ManagementPageShell>
  );
}
