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
  const [membershipId, setMembershipId] = useState(1);
  const [membershipExpiresAt, setMembershipExpiresAt] = useState('');
  const [trustTierId, setTrustTierId] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [allowDirectoryAddByRSS, setAllowDirectoryAddByRSS] = useState<boolean | null>(null);
  const [maxAddByRSSFeeds, setMaxAddByRSSFeeds] = useState<string>('');
  const [maxManualRefreshesPerHour, setMaxManualRefreshesPerHour] = useState<string>('');
  const [trackStats, setTrackStats] = useState<boolean | null>(null);
  const [allowNotifications, setAllowNotifications] = useState<boolean | null>(null);

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
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="membership-id">
              {t('membershipForm.membershipStatus')}
            </label>
            <select
              id="membership-id"
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
                ? t('membershipForm.hintTrialNew')
                : t('membershipForm.hintPremiumNew')}
            </p>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="membership-expires-at">
              {t('membershipForm.membershipExpiresAt')}
            </label>
            <input
              id="membership-expires-at"
              type="datetime-local"
              className={styles.input}
              value={membershipExpiresAt}
              onChange={(e) => setMembershipExpiresAt(e.target.value)}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="trust-tier-id">
              {t('membershipForm.trustTier')}
            </label>
            <select
              id="trust-tier-id"
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
                <label className={styles.label} htmlFor="allow-directory-add">
                  {t('advancedOverrides.allowDirectoryAddByRss')}
                </label>
                <select
                  id="allow-directory-add"
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
                <label className={styles.label} htmlFor="max-add-by-rss-feeds">
                  {t('advancedOverrides.addByRssFeedLimit')}
                </label>
                <input
                  id="max-add-by-rss-feeds"
                  type="number"
                  min={0}
                  className={styles.input}
                  value={maxAddByRSSFeeds}
                  onChange={(e) => setMaxAddByRSSFeeds(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="max-manual-refreshes">
                  {t('advancedOverrides.manualRefreshPerHour')}
                </label>
                <input
                  id="max-manual-refreshes"
                  type="number"
                  min={0}
                  className={styles.input}
                  value={maxManualRefreshesPerHour}
                  onChange={(e) => setMaxManualRefreshesPerHour(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="track-stats">
                  {t('advancedOverrides.trackStats')}
                </label>
                <select
                  id="track-stats"
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
                <label className={styles.label} htmlFor="allow-notifications">
                  {t('advancedOverrides.allowNotifications')}
                </label>
                <select
                  id="allow-notifications"
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
