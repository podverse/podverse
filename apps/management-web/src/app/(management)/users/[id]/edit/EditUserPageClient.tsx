'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import {
  changeUserPassword,
  getUser,
  updateUser,
  type User,
} from '../../../../../lib/requests/users';

import styles from './page.module.scss';

type Props = {
  userId: number;
  initialTab?: string;
};

export function EditUserPageClient({ userId, initialTab }: Props) {
  const t = useTranslations('users');
  const tc = useTranslations('common');

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Profile fields
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [verified, setVerified] = useState(false);

  // Password fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const activeTab = initialTab === 'password' ? 'password' : 'profile';

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const result = await getUser(userId);
        if (!cancelled) {
          setUser(result.user);
          setEmail(result.user.email ?? '');
          setUsername(result.user.username ?? '');
          setVerified(result.user.verified);
        }
      } catch {
        if (!cancelled) setError(t('failedToLoad'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [userId, t]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await updateUser(userId, {
        email: email || undefined,
        username: username || undefined,
        verified,
      });
      setUser(result.user);
      setSuccess(t('updatedSuccessfully'));
    } catch {
      setError(t('failedToUpdate'));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setError(null);
    setSuccess(null);

    if (newPassword.length < 8) {
      setPasswordError(t('passwordMinLength'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      await changeUserPassword(userId, newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setSuccess(t('passwordChanged'));
    } catch {
      setError(t('failedToUpdate'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className={styles.loadingText}>{tc('loading')}</p>;
  if (error && !user) return <p className={styles.errorText}>{error}</p>;
  if (!user) return null;

  return (
    <div className="container">
      <Link href={`/users/${userId}`} className={styles.backLink}>
        &larr; {t('userDetail')}
      </Link>
      <div className="page-header">
        <h1 className="page-title">{t('editUser')}</h1>
      </div>

      <div className={styles.tabContainer}>
        <Link
          href={`/users/${userId}/edit?tab=profile`}
          className={`${styles.tab}${activeTab === 'profile' ? ` ${styles.activeTab}` : ''}`}
        >
          {t('profile')}
        </Link>
        <Link
          href={`/users/${userId}/edit?tab=password`}
          className={`${styles.tab}${activeTab === 'password' ? ` ${styles.activeTab}` : ''}`}
        >
          {t('changePassword')}
        </Link>
      </div>

      {error && <p className={styles.errorText}>{error}</p>}
      {success && <p className={styles.successText}>{success}</p>}

      {activeTab === 'profile' ? (
        <form onSubmit={(e) => void handleProfileSubmit(e)}>
          <div className={styles.formGroup}>
            <label className={styles.label}>{t('tableHeaders.email')}</label>
            <input
              className={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>{t('tableHeaders.username')}</label>
            <input
              className={styles.input}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={verified}
                onChange={(e) => setVerified(e.target.checked)}
              />
              {t('verified')}
            </label>
          </div>

          <div className={styles.actions}>
            <button className={styles.saveButton} type="submit" disabled={saving}>
              {saving ? tc('saving') : tc('saveChanges')}
            </button>
            <Link href={`/users/${userId}`} className={styles.cancelLink}>
              {tc('cancel')}
            </Link>
          </div>
        </form>
      ) : (
        <form onSubmit={(e) => void handlePasswordSubmit(e)}>
          {passwordError && <p className={styles.errorText}>{passwordError}</p>}

          <div className={styles.formGroup}>
            <label className={styles.label}>{tc('newPassword') || 'New Password'}</label>
            <input
              className={styles.input}
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Confirm Password</label>
            <input
              className={styles.input}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div className={styles.actions}>
            <button className={styles.saveButton} type="submit" disabled={saving}>
              {saving ? tc('saving') : tc('saveChanges')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
