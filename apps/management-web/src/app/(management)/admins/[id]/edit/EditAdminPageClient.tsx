'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { type AdminAccount, updateAdmin } from '../../../../../lib/requests/admins';

import styles from './page.module.scss';

const RESOURCE_KEYS = [
  'feeds_crud',
  'feed_flag_statuses_crud',
  'feed_flag_status_reasons_crud',
  'admins_crud',
  'stats_crud',
] as const;

const CRUD_BITS = [
  { bit: 1, labelKey: 'create' },
  { bit: 2, labelKey: 'read' },
  { bit: 4, labelKey: 'update' },
  { bit: 8, labelKey: 'deletePerm' },
] as const;

type PermissionState = {
  feeds_crud: number;
  feed_flag_statuses_crud: number;
  feed_flag_status_reasons_crud: number;
  admins_crud: number;
  stats_crud: number;
};

const RESOURCE_LABEL_KEYS: Record<(typeof RESOURCE_KEYS)[number], string> = {
  feeds_crud: 'feeds',
  feed_flag_statuses_crud: 'flagStatuses',
  feed_flag_status_reasons_crud: 'statusReasons',
  admins_crud: 'admins',
  stats_crud: 'stats',
};

function permissionsFromAdmin(admin: AdminAccount): PermissionState {
  return {
    feeds_crud: admin.permissions?.feeds_crud ?? 0,
    feed_flag_statuses_crud: admin.permissions?.feed_flag_statuses_crud ?? 0,
    feed_flag_status_reasons_crud: admin.permissions?.feed_flag_status_reasons_crud ?? 0,
    admins_crud: admin.permissions?.admins_crud ?? 0,
    stats_crud: admin.permissions?.stats_crud ?? 0,
  };
}

export type EditAdminPageClientProps = {
  admin: AdminAccount;
};

export function EditAdminPageClient({ admin }: EditAdminPageClientProps) {
  const router = useRouter();
  const [email, setEmail] = useState(admin.email ?? '');
  const [password, setPassword] = useState('');
  const [permissions, setPermissions] = useState<PermissionState>(permissionsFromAdmin(admin));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const t = useTranslations('admins');
  const tc = useTranslations('common');
  const ta = useTranslations('auth');
  const tp = useTranslations('admins.permissions');

  const toggleCrudBit = (resource: keyof PermissionState, bit: number) => {
    setPermissions((prev) => ({
      ...prev,
      [resource]: prev[resource] ^ bit,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const updateData: {
        email?: string;
        password?: string;
        permissions?: Partial<PermissionState>;
      } = {};
      if (email !== (admin.email ?? '')) {
        updateData.email = email;
      }
      if (password) {
        updateData.password = password;
      }
      const currentPerms = permissionsFromAdmin(admin);
      const permsChanged = RESOURCE_KEYS.some((key) => permissions[key] !== currentPerms[key]);
      if (permsChanged) {
        updateData.permissions = permissions;
      }

      await updateAdmin(admin.id, updateData);
      setSuccess(true);
      router.push('/admins');
    } catch (err) {
      const raw =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: unknown } } }).response?.data?.message
          : undefined;
      const message = typeof raw === 'string' && raw.length > 0 ? raw : t('failedToUpdate');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">{t('editAdmin')}</h1>
        <div className={styles.breadcrumbs}>
          <Link href="/admins" className={styles.breadcrumbLink}>
            {t('title')}
          </Link>
          <span className={styles.breadcrumbSep}>/</span>
          <span>{t('editAdminItem', { email: admin.email ?? admin.id_text })}</span>
        </div>
      </div>
      <main>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="email">
              {ta('email')}
            </label>
            <input
              id="email"
              type="email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="password">
              {ta('newPassword')}
            </label>
            <input
              id="password"
              type="password"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={ta('leaveBlankToKeepCurrent')}
              minLength={8}
            />
          </div>
          <fieldset className={styles.fieldset}>
            <legend className={styles.fieldsetLegend}>{tp('legend')}</legend>
            <table className={styles.permTable}>
              <thead>
                <tr>
                  <th>{tp('resource')}</th>
                  {CRUD_BITS.map((check) => (
                    <th key={check.bit}>{tp(check.labelKey)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RESOURCE_KEYS.map((key) => (
                  <tr key={key}>
                    <td>{tp(RESOURCE_LABEL_KEYS[key])}</td>
                    {CRUD_BITS.map((check) => (
                      <td key={check.bit}>
                        <input
                          type="checkbox"
                          checked={(permissions[key] & check.bit) !== 0}
                          onChange={() => toggleCrudBit(key, check.bit)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </fieldset>
          {error && <p className={styles.errorText}>{error}</p>}
          {success && <p className={styles.successText}>{t('updatedSuccessfully')}</p>}
          <div className={styles.formActions}>
            <button type="submit" className={styles.submitButton} disabled={loading}>
              {loading ? tc('saving') : tc('saveChanges')}
            </button>
            <Link href="/admins" className={styles.cancelLink}>
              {tc('cancel')}
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
