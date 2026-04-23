'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { type AdminAccount, listAdmins } from '../../../lib/requests/admins';
import { type CurrentUser } from '../../../lib/requests/auth';

import styles from './page.module.scss';

const CRUD_LABELS: Record<number, string> = {
  0: 'None',
  1: 'C',
  2: 'R',
  3: 'CR',
  4: 'U',
  5: 'CU',
  6: 'RU',
  7: 'CRU',
  8: 'D',
  9: 'CD',
  10: 'RD',
  11: 'CRD',
  12: 'UD',
  13: 'CUD',
  14: 'RUD',
  15: 'CRUD',
};

function crudLabel(value: number): string {
  return CRUD_LABELS[value] ?? String(value);
}

export type AdminsListPageClientProps = {
  initialUser: CurrentUser;
};

export function AdminsListPageClient({ initialUser }: AdminsListPageClientProps) {
  const [user] = useState<CurrentUser>(initialUser);
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations('admins');
  const tc = useTranslations('common');

  const isSuperuser = user.role === 'superuser';
  const canCreate = isSuperuser;

  useEffect(() => {
    let cancelled = false;

    const loadAdmins = async () => {
      try {
        const list = await listAdmins();
        if (!cancelled) {
          setAdmins(list);
        }
      } catch (err) {
        if (!cancelled) {
          setError(t('failedToLoad'));
          console.error('Error loading admins:', err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadAdmins();

    return () => {
      cancelled = true;
    };
  }, [t]);

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">{t('title')}</h1>
        <div className={styles.headerActions}>
          {canCreate && (
            <Link href="/admins/new" className={styles.createButton}>
              {t('createAdmin')}
            </Link>
          )}
        </div>
      </div>
      <main>
        {loading && <p className={styles.loadingText}>{tc('loading')}</p>}
        {error && <p className={styles.errorText}>{error}</p>}
        {!loading && !error && (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t('tableHeaders.id')}</th>
                  <th>{t('tableHeaders.email')}</th>
                  <th>{t('tableHeaders.role')}</th>
                  <th>{t('tableHeaders.feeds')}</th>
                  <th>{t('tableHeaders.flagStatuses')}</th>
                  <th>{t('tableHeaders.statusReasons')}</th>
                  <th>{t('tableHeaders.admins')}</th>
                  <th>{t('tableHeaders.stats')}</th>
                  <th>{tc('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.id}>
                    <td>{admin.id_text}</td>
                    <td>{admin.email ?? '-'}</td>
                    <td>
                      <span
                        className={admin.role === 'superuser' ? styles.superuser : styles.admin}
                      >
                        {admin.role}
                      </span>
                    </td>
                    <td>{crudLabel(admin.permissions?.feeds_crud ?? 0)}</td>
                    <td>{crudLabel(admin.permissions?.feed_flag_statuses_crud ?? 0)}</td>
                    <td>{crudLabel(admin.permissions?.feed_flag_status_reasons_crud ?? 0)}</td>
                    <td>{crudLabel(admin.permissions?.admins_crud ?? 0)}</td>
                    <td>{crudLabel(admin.permissions?.stats_crud ?? 0)}</td>
                    <td>
                      {admin.role !== 'superuser' && isSuperuser && (
                        <Link href={`/admins/${admin.id}/edit`} className={styles.editLink}>
                          {tc('edit')}
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
