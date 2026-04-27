'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Disclosure } from '@podverse/ui';

import { Card } from '../../../components/ui/Card/Card';
import type { CurrentUser } from '../../../lib/requests/auth';
import { getCurrentUser } from '../../../lib/requests/auth';
import { listWorkerCommands, type WorkerCommandRow } from '../../../lib/requests/workerCommands';

import styles from './page.module.scss';

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

function riskClass(risk: WorkerCommandRow['risk']): string {
  if (risk === 'long_running') {
    return styles.badgeLong ?? styles.badgeNormal ?? '';
  }
  if (risk === 'dev_only') {
    return styles.badgeDev ?? styles.badgeNormal ?? '';
  }
  return styles.badgeNormal ?? '';
}

export function WorkersPageClient({ initialUser }: WorkersPageClientProps) {
  const [user, setUser] = useState<CurrentUser>(initialUser);
  const [commands, setCommands] = useState<WorkerCommandRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [copyError, setCopyError] = useState<string | null>(null);
  const [copyOk, setCopyOk] = useState(false);
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

  const onCopy = useCallback(
    async (line: string) => {
      setCopyError(null);
      setCopyOk(false);
      try {
        await navigator.clipboard.writeText(line);
        setCopyOk(true);
        setTimeout(() => {
          setCopyOk(false);
        }, 2000);
      } catch {
        setCopyError(t('copyFailed'));
        setTimeout(() => {
          setCopyError(null);
        }, 4000);
      }
    },
    [t]
  );

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">{t('title')}</h1>
      </div>
      <main>
        <p className={styles.intro}>
          {t.rich('intro', {
            code: (chunks) => <code>{chunks}</code>,
          })}
        </p>
        {copyOk && (
          <p className={styles.countHint} role="status">
            {t('copiedToClipboard')}
          </p>
        )}
        {copyError && (
          <p className={styles.errorText} role="alert">
            {copyError}
          </p>
        )}

        {!isSuperuser && (
          <Card variant="bordered">
            <h2>{t('superuserOnly')}</h2>
            <p className={styles.restrictedText}>
              {t.rich('superuserOnlyDescription', {
                code: (chunks) => <code>{chunks}</code>,
              })}
            </p>
          </Card>
        )}

        {isSuperuser && loading && <p className={styles.loadingText}>{t('loadingCommands')}</p>}
        {isSuperuser && !loading && loadError && <p className={styles.errorText}>{loadError}</p>}

        {isSuperuser && !loading && !loadError && commands && (
          <>
            <div className={styles.filterRow}>
              <span className={styles.filterLabel} id="worker-filter-label">
                {tc('search')}
              </span>
              <input
                className={styles.filterInput}
                type="search"
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value);
                }}
                placeholder={t('searchPlaceholder')}
                autoComplete="off"
                aria-labelledby="worker-filter-label"
              />
              <span className={styles.countHint}>
                {t('commandCount', { shown: rows.length, total: commands.length })}
              </span>
            </div>
            <div className={styles.categoryStack}>
              {commandGroups.map(({ category, rows: groupRows }) => (
                <Disclosure key={category} title={getCategoryLabel(category)}>
                  <div className={styles.tableScrollInDisclosure}>
                    <table className={styles.dataTable}>
                      <thead>
                        <tr>
                          <th>{t('tableHeaders.command')}</th>
                          <th>{t('tableHeaders.description')}</th>
                          <th>{t('tableHeaders.risk')}</th>
                          <th>{tc('actions')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupRows.map((row) => (
                          <tr key={row.name}>
                            <td>
                              <div className={styles.commandName}>{row.name}</div>
                              <div>{row.label}</div>
                            </td>
                            <td className={styles.desc}>{row.description}</td>
                            <td>
                              <span className={riskClass(row.risk)} title={getRiskLabel(row.risk)}>
                                {getRiskLabel(row.risk)}
                              </span>
                            </td>
                            <td>
                              <div className={styles.actions}>
                                <button
                                  type="button"
                                  className={styles.copyBtn}
                                  onClick={() => {
                                    void onCopy(row.example_cli);
                                  }}
                                >
                                  {t('copyExample')}
                                </button>
                                {row.related_management_path ? (
                                  <Link className={styles.link} href={row.related_management_path}>
                                    {t('openRelatedTool')}
                                  </Link>
                                ) : null}
                                <code className={styles.exampleCli}>{row.example_cli}</code>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Disclosure>
              ))}
            </div>
            {rows.length === 0 && <p className={styles.countHint}>{t('noMatchingCommands')}</p>}
          </>
        )}
      </main>
    </div>
  );
}
