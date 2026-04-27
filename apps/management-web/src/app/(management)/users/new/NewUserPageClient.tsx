'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { createUser } from '../../../../lib/requests/users';

import styles from './page.module.scss';

const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function NewUserPageClient() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const t = useTranslations('users');
  const tc = useTranslations('common');

  const handleCopy = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select the input
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setInviteLink(null);

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedUsername && !trimmedEmail) {
      setError(t('emailOrUsernameRequired'));
      setLoading(false);
      return;
    }

    if (
      trimmedUsername &&
      (trimmedUsername.length < 3 ||
        trimmedUsername.length > 32 ||
        !USERNAME_REGEX.test(trimmedUsername))
    ) {
      setError(t('invalidUsername'));
      setLoading(false);
      return;
    }

    if (trimmedEmail && !isValidEmail(trimmedEmail)) {
      setError(t('invalidEmail'));
      setLoading(false);
      return;
    }

    if (trimmedPassword && trimmedPassword.length < 8) {
      setError(t('passwordMinLength'));
      setLoading(false);
      return;
    }

    try {
      const result = await createUser({
        ...(trimmedUsername ? { username: trimmedUsername } : {}),
        ...(trimmedEmail ? { email: trimmedEmail } : {}),
        ...(trimmedPassword ? { password: trimmedPassword } : {}),
      });

      if (result.set_password_url) {
        setInviteLink(result.set_password_url);
      } else {
        setSuccessMessage(t('createdSuccessfully'));
      }

      setUsername('');
      setEmail('');
      setPassword('');
    } catch (err) {
      const raw =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: unknown } } }).response?.data?.message
          : undefined;
      const message = typeof raw === 'string' && raw.length > 0 ? raw : t('failedToCreate');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (inviteLink !== null) {
    return (
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">{t('createUser')}</h1>
          <div className={styles.breadcrumbs}>
            <Link href="/users" className={styles.breadcrumbLink}>
              {t('title')}
            </Link>
            <span className={styles.breadcrumbSep}>/</span>
            <span>{tc('new')}</span>
          </div>
        </div>
        <main>
          <div className={styles.form}>
            <p className={styles.successText}>{t('createdWithLink')}</p>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="invite-link">
                {t('inviteLinkLabel')}
              </label>
              <div className={styles.inviteLinkRow}>
                <input
                  id="invite-link"
                  type="text"
                  className={styles.input}
                  value={inviteLink}
                  readOnly
                />
                <button
                  type="button"
                  className={styles.copyButton}
                  onClick={() => void handleCopy()}
                >
                  {copied ? t('linkCopied') : t('copyLink')}
                </button>
              </div>
            </div>
            <div className={styles.formActions}>
              <Link href="/users" className={styles.cancelLink}>
                {t('backToList')}
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">{t('createUser')}</h1>
        <div className={styles.breadcrumbs}>
          <Link href="/users" className={styles.breadcrumbLink}>
            {t('title')}
          </Link>
          <span className={styles.breadcrumbSep}>/</span>
          <span>{tc('new')}</span>
        </div>
      </div>
      <main>
        <form onSubmit={(e) => void handleSubmit(e)} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="username">
              {t('usernameOptional')}
            </label>
            <input
              id="username"
              type="text"
              className={styles.input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="email">
              {t('emailOptional')}
            </label>
            <input
              id="email"
              type="email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
            />
          </div>
          <p className={styles.hintText}>{t('emailOrUsernameHint')}</p>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="password">
              {t('passwordOptional')}
            </label>
            <input
              id="password"
              type="password"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          {error && <p className={styles.errorText}>{error}</p>}
          {successMessage && <p className={styles.successText}>{successMessage}</p>}
          <div className={styles.formActions}>
            <button type="submit" className={styles.submitButton} disabled={loading}>
              {loading ? tc('creating') : t('createUser')}
            </button>
            <Link href="/users" className={styles.cancelLink}>
              {tc('cancel')}
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
