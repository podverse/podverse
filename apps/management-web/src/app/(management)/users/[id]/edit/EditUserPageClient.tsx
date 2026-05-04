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
  const ta = useTranslations('auth');
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
  const [membershipId, setMembershipId] = useState(1);
  const [membershipExpiresAt, setMembershipExpiresAt] = useState('');
  const [trustTierId, setTrustTierId] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [allowDirectoryAddByRSS, setAllowDirectoryAddByRSS] = useState<boolean | null>(null);
  const [maxAddByRSSFeeds, setMaxAddByRSSFeeds] = useState<string>('');
  const [maxManualRefreshesPerHour, setMaxManualRefreshesPerHour] = useState<string>('');
  const [trackStats, setTrackStats] = useState<boolean | null>(null);
  const [allowNotifications, setAllowNotifications] = useState<boolean | null>(null);

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
          setMembershipId(result.user.account_membership_id ?? 1);
          setMembershipExpiresAt(
            result.user.membership_expires_at === null
              ? ''
              : String(result.user.membership_expires_at).slice(0, 16)
          );
          setTrustTierId(result.user.account_trust_tier_id ?? 1);
          setAllowDirectoryAddByRSS(result.user.allow_directory_add_by_rss ?? null);
          setMaxAddByRSSFeeds(
            result.user.max_add_by_rss_feeds !== null
              ? String(result.user.max_add_by_rss_feeds)
              : ''
          );
          setMaxManualRefreshesPerHour(
            result.user.max_manual_refreshes_per_hour !== null
              ? String(result.user.max_manual_refreshes_per_hour)
              : ''
          );
          setTrackStats(result.user.track_stats ?? null);
          setAllowNotifications(result.user.allow_notifications ?? null);
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
        account_membership_id: membershipId,
        membership_expires_at: membershipExpiresAt.trim() === '' ? null : membershipExpiresAt,
        account_trust_tier_id: trustTierId,
        allow_directory_add_by_rss: allowDirectoryAddByRSS,
        max_add_by_rss_feeds:
          maxAddByRSSFeeds.trim() === '' ? null : Number.parseInt(maxAddByRSSFeeds, 10),
        max_manual_refreshes_per_hour:
          maxManualRefreshesPerHour.trim() === ''
            ? null
            : Number.parseInt(maxManualRefreshesPerHour, 10),
        track_stats: trackStats,
        allow_notifications: allowNotifications,
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
      setPasswordError(t('passwordsDoNotMatch'));
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
          <div className={styles.formGroup}>
            <label className={styles.label}>{t('membershipForm.membershipStatus')}</label>
            <select
              className={styles.input}
              value={membershipId}
              onChange={(e) => {
                const nextMembershipId = Number(e.target.value);
                setMembershipId(nextMembershipId);
                setTrustTierId(nextMembershipId === 2 ? 2 : 1);
              }}
            >
              <option value={1}>{t('membershipForm.trial')}</option>
              <option value={2}>{t('membershipForm.premium')}</option>
            </select>
            <p className={styles.hintText}>
              {membershipId === 1
                ? t('membershipForm.hintTrialEdit')
                : t('membershipForm.hintPremiumEdit')}
            </p>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>{t('membershipForm.membershipExpiresAt')}</label>
            <input
              className={styles.input}
              type="datetime-local"
              value={membershipExpiresAt}
              onChange={(e) => setMembershipExpiresAt(e.target.value)}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>{t('membershipForm.trustTier')}</label>
            <select
              className={styles.input}
              value={trustTierId}
              onChange={(e) => setTrustTierId(Number(e.target.value))}
            >
              <option value={1}>{t('membershipForm.untrusted')}</option>
              <option value={2}>{t('membershipForm.trusted')}</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={showAdvanced}
                onChange={(e) => setShowAdvanced(e.target.checked)}
              />
              {t('membershipForm.configureAdvancedOverrides')}
            </label>
          </div>
          {showAdvanced && (
            <>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  {t('advancedOverrides.allowDirectoryAddByRss')}
                </label>
                <select
                  className={styles.input}
                  value={
                    allowDirectoryAddByRSS === null ? '' : allowDirectoryAddByRSS ? 'true' : 'false'
                  }
                  onChange={(e) => {
                    if (e.target.value === '') {
                      setAllowDirectoryAddByRSS(null);
                    } else {
                      setAllowDirectoryAddByRSS(e.target.value === 'true');
                    }
                  }}
                >
                  <option value="">{t('advancedOverrides.useTrustTierDefault')}</option>
                  <option value="true">{t('advancedOverrides.allow')}</option>
                  <option value="false">{t('advancedOverrides.block')}</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>{t('advancedOverrides.addByRssFeedLimit')}</label>
                <input
                  className={styles.input}
                  type="number"
                  min={0}
                  value={maxAddByRSSFeeds}
                  onChange={(e) => setMaxAddByRSSFeeds(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  {t('advancedOverrides.manualRefreshPerHour')}
                </label>
                <input
                  className={styles.input}
                  type="number"
                  min={0}
                  value={maxManualRefreshesPerHour}
                  onChange={(e) => setMaxManualRefreshesPerHour(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>{t('advancedOverrides.trackStats')}</label>
                <select
                  className={styles.input}
                  value={trackStats === null ? '' : trackStats ? 'true' : 'false'}
                  onChange={(e) => {
                    if (e.target.value === '') {
                      setTrackStats(null);
                    } else {
                      setTrackStats(e.target.value === 'true');
                    }
                  }}
                >
                  <option value="">{t('advancedOverrides.useTrustTierDefault')}</option>
                  <option value="true">{t('advancedOverrides.trackStatsOn')}</option>
                  <option value="false">{t('advancedOverrides.trackStatsOff')}</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>{t('advancedOverrides.allowNotifications')}</label>
                <select
                  className={styles.input}
                  value={allowNotifications === null ? '' : allowNotifications ? 'true' : 'false'}
                  onChange={(e) => {
                    if (e.target.value === '') {
                      setAllowNotifications(null);
                    } else {
                      setAllowNotifications(e.target.value === 'true');
                    }
                  }}
                >
                  <option value="">{t('advancedOverrides.useTrustTierDefault')}</option>
                  <option value="true">{t('advancedOverrides.allowNotificationsOn')}</option>
                  <option value="false">{t('advancedOverrides.allowNotificationsOff')}</option>
                </select>
              </div>
            </>
          )}

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
            <label className={styles.label}>{ta('newPassword')}</label>
            <input
              className={styles.input}
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>{ta('confirmPassword')}</label>
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
