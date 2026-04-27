'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import {
  deleteUser,
  generateInviteLink,
  getInviteLink,
  getUser,
  type InviteLink,
  revokeInviteLink,
  type User,
} from '../../../../lib/requests/users';

import styles from './page.module.scss';

type Props = {
  userId: number;
};

export function UserDetailPageClient({ userId }: Props) {
  const t = useTranslations('users');
  const tc = useTranslations('common');

  const [user, setUser] = useState<User | null>(null);
  const [inviteLink, setInviteLink] = useState<InviteLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadInviteLink = useCallback(async () => {
    try {
      const result = await getInviteLink(userId);
      setInviteLink(result.invite_link);
    } catch {
      // Non-critical -- just don't show invite link section
    }
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const result = await getUser(userId);
        if (!cancelled) {
          setUser(result.user);
          void loadInviteLink();
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
  }, [userId, t, loadInviteLink]);

  const handleDelete = async () => {
    if (!window.confirm(t('confirmDelete'))) return;
    try {
      await deleteUser(userId);
      window.location.href = '/users';
    } catch {
      setError(t('failedToDelete'));
    }
  };

  const handleGenerateLink = async () => {
    try {
      const result = await generateInviteLink(userId);
      setInviteLink(result.invite_link);
      setCopied(false);
    } catch {
      setError(t('failedToUpdate'));
    }
  };

  const handleRevokeLink = async () => {
    try {
      await revokeInviteLink(userId);
      setInviteLink(null);
      setCopied(false);
    } catch {
      setError(t('failedToUpdate'));
    }
  };

  const handleCopyLink = () => {
    if (!inviteLink?.url) return;
    void navigator.clipboard.writeText(inviteLink.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <p className={styles.loadingText}>{tc('loading')}</p>;
  if (error) return <p className={styles.errorText}>{error}</p>;
  if (!user) return <p className={styles.errorText}>{t('failedToLoad')}</p>;

  return (
    <div className="container">
      <Link href="/users" className={styles.backLink}>
        &larr; {t('backToList')}
      </Link>
      <div className="page-header">
        <h1 className="page-title">{t('userDetail')}</h1>
      </div>
      <main>
        <div className={styles.detailGrid}>
          <span className={styles.label}>ID</span>
          <span className={styles.value}>{user.id_text}</span>

          <span className={styles.label}>{t('tableHeaders.email')}</span>
          <span className={styles.value}>{user.email ?? '-'}</span>

          <span className={styles.label}>{t('tableHeaders.username')}</span>
          <span className={styles.value}>{user.username ?? '-'}</span>

          <span className={styles.label}>{t('tableHeaders.verified')}</span>
          <span className={styles.value}>
            <span
              className={`${styles.verifiedBadge} ${user.verified ? styles.verifiedYes : styles.verifiedNo}`}
            >
              {user.verified ? tc('yes') : tc('no')}
            </span>
          </span>

          <span className={styles.label}>{t('tableHeaders.createdAt')}</span>
          <span className={styles.value}>
            {user.created_at ? new Date(user.created_at).toLocaleString() : '-'}
          </span>
        </div>

        <div className={styles.actionsRow}>
          <Link href={`/users/${userId}/edit`} className={styles.editLink}>
            {tc('edit')}
          </Link>
          <button className={styles.editLink} onClick={() => void handleDelete()} type="button">
            {tc('delete')}
          </button>
        </div>

        <hr className={styles.divider} />

        <h2>{t('inviteLinks')}</h2>
        {inviteLink ? (
          <div>
            <p>
              <strong>{t('activeInviteLink')}</strong>
            </p>
            <p className={styles.inviteUrl}>
              <a href={inviteLink.url} target="_blank" rel="noopener noreferrer">
                {inviteLink.url}
              </a>
            </p>
            <p className={styles.inviteExpiry}>
              {t('expiresAt', {
                date: new Date(inviteLink.expires_at).toLocaleString(),
              })}
            </p>
            <div className={styles.inviteActions}>
              <button className={styles.editLink} onClick={handleCopyLink} type="button">
                {copied ? t('linkCopied') : t('copyLink')}
              </button>
              <button
                className={styles.editLink}
                onClick={() => void handleRevokeLink()}
                type="button"
              >
                {t('revokeLink')}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className={styles.noInviteText}>{t('noActiveInviteLinks')}</p>
            <button
              className={styles.editLink}
              onClick={() => void handleGenerateLink()}
              type="button"
            >
              {t('generateInviteLink')}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
