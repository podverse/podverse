'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { StatusBadgeVariant } from '@podverse/ui';
import {
  ActionLink,
  Alert,
  CodeText,
  CopyToClipboardButton,
  Disclosure,
  fieldPrimitiveClasses,
  FormGroup,
  FormHintText,
  Input,
  Label,
  LeadParagraph,
  LoadingText,
  ManagementPageShell,
  RestrictedNotice,
  StatusBadge,
  Table,
} from '@podverse/ui';

import type { CurrentUser } from '../../../lib/requests/auth';
import { getCurrentUser } from '../../../lib/requests/auth';
import { listWorkerCommands, type WorkerCommandRow } from '../../../lib/requests/workerCommands';

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
  const [filter, setFilter] = useState('');
  const router = useRouter();
  const t = useTranslations('workers');
  const tc = useTranslations('common');

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

  const rows = useMemo(() => {
    if (!commands) {
      return [];
    }
    return commands.filter((r) => matchesQuery(r, filter));
  }, [commands, filter, matchesQuery]);

  const commandGroups = useMemo(() => {
    const byCategory = new Map<string, WorkerCommandRow[]>();
    for (const row of rows) {
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
  }, [rows, getCategoryLabel]);

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

      {isSuperuser && loading && <LoadingText>{t('loadingCommands')}</LoadingText>}
      {isSuperuser && !loading && loadError && <Alert>{loadError}</Alert>}

      {isSuperuser && !loading && !loadError && commands && (
        <>
          <FormGroup>
            <Label htmlFor="worker-command-filter">{tc('search')}</Label>
            <Input
              id="worker-command-filter"
              type="search"
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
              }}
              placeholder={t('searchPlaceholder')}
              autoComplete="off"
              className={fieldPrimitiveClasses.input}
              style={{ maxWidth: '32rem' }}
            />
            <FormHintText variant="block">
              {t('commandCount', { shown: rows.length, total: commands.length })}
            </FormHintText>
          </FormGroup>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
            {commandGroups.map(({ category, rows: groupRows }) => (
              <Disclosure key={category} title={getCategoryLabel(category)}>
                <Table.ScrollContainer>
                  <Table>
                    <Table.Head>
                      <Table.Row>
                        <Table.HeaderCell>{t('tableHeaders.command')}</Table.HeaderCell>
                        <Table.HeaderCell>{t('tableHeaders.description')}</Table.HeaderCell>
                        <Table.HeaderCell>{t('tableHeaders.risk')}</Table.HeaderCell>
                        <Table.HeaderCell>{tc('actions')}</Table.HeaderCell>
                      </Table.Row>
                    </Table.Head>
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
                                textToCopy={row.example_cli}
                                idleLabel={t('copyExample')}
                                copiedLabel={t('copiedToClipboard')}
                                errorLabel={t('copyFailed')}
                              />
                              {row.related_management_path ? (
                                <ActionLink
                                  href={row.related_management_path}
                                  LinkComponent={Link}
                                  variant="inline"
                                >
                                  {t('openRelatedTool')}
                                </ActionLink>
                              ) : null}
                              <CodeText variant="block">{row.example_cli}</CodeText>
                            </div>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table>
                </Table.ScrollContainer>
              </Disclosure>
            ))}
          </div>
          {rows.length === 0 && (
            <FormHintText variant="block">{t('noMatchingCommands')}</FormHintText>
          )}
        </>
      )}
    </ManagementPageShell>
  );
}
