'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { toDatetimeLocalInputValue } from '@podverse/helpers';
import {
  ActionLink,
  Alert,
  Button,
  CheckboxField,
  fieldPrimitiveClasses,
  FormContainer,
  FormGroup,
  FormHintText,
  FormPrimaryActions,
  Label,
  ManagementPageShell,
  Select,
  Tabs,
  TextInput,
} from '@podverse/ui';

import { ManagementLoadingSpinnerFull } from '../../../../../components/LoadingSpinner/ManagementLoadingSpinnerFull';
import {
  changeUserPassword,
  getUser,
  updateUser,
  type User,
} from '../../../../../lib/requests/users';

type Props = {
  userId: number;
  initialTab?: string;
};

export function EditUserPageClient({ userId, initialTab }: Props) {
  const router = useRouter();
  const t = useTranslations('users');
  const ta = useTranslations('auth');
  const tc = useTranslations('common');

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [verified, setVerified] = useState(false);
  const [membershipId, setMembershipId] = useState(1);
  const [membershipExpiresAt, setMembershipExpiresAt] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [allowDirectoryAddByRSS, setAllowDirectoryAddByRSS] = useState<boolean | null>(null);
  const [maxAddByRSSFeeds, setMaxAddByRSSFeeds] = useState<string>('');
  const [maxManualRefreshesPerHour, setMaxManualRefreshesPerHour] = useState<string>('');
  const [trackStats, setTrackStats] = useState<boolean | null>(null);
  const [allowNotifications, setAllowNotifications] = useState<boolean | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const activeTab = initialTab === 'password' ? 'password' : 'profile';

  const tabData = useMemo(
    () => [
      {
        key: 'profile',
        label: t('profile'),
        zIndex: 2,
        onClick: () => {
          router.push(`/users/${userId}/edit?tab=profile`);
        },
      },
      {
        key: 'password',
        label: t('changePassword'),
        zIndex: 1,
        onClick: () => {
          router.push(`/users/${userId}/edit?tab=password`);
        },
      },
    ],
    [router, t, userId]
  );

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
              : toDatetimeLocalInputValue(result.user.membership_expires_at)
          );
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

  if (loading) return <ManagementLoadingSpinnerFull />;
  if (error && !user) return <Alert>{error}</Alert>;
  if (!user) return null;

  return (
    <ManagementPageShell title={t('editUser')}>
      <ActionLink href={`/users/${userId}`} variant="inline" LinkComponent={Link}>
        &larr; {t('userDetail')}
      </ActionLink>

      <Tabs selectedKey={activeTab} tabData={tabData} />

      <Alert>{error}</Alert>
      {success && <Alert variant="success">{success}</Alert>}

      {activeTab === 'profile' ? (
        <FormContainer onSubmit={(e) => void handleProfileSubmit(e)}>
          <TextInput
            id="edit-user-email"
            eyebrow={t('tableHeaders.email')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <TextInput
            id="edit-user-username"
            eyebrow={t('tableHeaders.username')}
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <FormGroup>
            <CheckboxField
              checked={verified}
              label={t('verified')}
              onChange={(checked) => setVerified(checked)}
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="edit-user-membership">{t('membershipForm.membershipStatus')}</Label>
            <Select
              id="edit-user-membership"
              className={fieldPrimitiveClasses.select}
              value={String(membershipId)}
              onChange={(e) => setMembershipId(Number(e.target.value))}
            >
              <option value={1}>{t('membershipForm.trial')}</option>
              <option value={2}>{t('membershipForm.premium')}</option>
            </Select>
            <FormHintText>
              {membershipId === 1
                ? t('membershipForm.hintTrialEdit')
                : t('membershipForm.hintPremiumEdit')}
            </FormHintText>
          </FormGroup>

          <TextInput
            id="edit-user-expires"
            eyebrow={t('membershipForm.membershipExpiresAt')}
            type="datetime-local"
            value={membershipExpiresAt}
            onChange={(e) => setMembershipExpiresAt(e.target.value)}
          />

          <FormGroup>
            <CheckboxField
              checked={showAdvanced}
              label={t('membershipForm.configureAdvancedOverrides')}
              onChange={(checked) => setShowAdvanced(checked)}
            />
          </FormGroup>

          {showAdvanced && (
            <>
              <FormGroup>
                <Label htmlFor="edit-user-add-by-rss">
                  {t('advancedOverrides.allowDirectoryAddByRss')}
                </Label>
                <Select
                  id="edit-user-add-by-rss"
                  className={fieldPrimitiveClasses.select}
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
                </Select>
              </FormGroup>
              <TextInput
                id="edit-user-rss-limit"
                eyebrow={t('advancedOverrides.addByRssFeedLimit')}
                min={0}
                type="number"
                value={maxAddByRSSFeeds}
                onChange={(e) => setMaxAddByRSSFeeds(e.target.value)}
              />
              <TextInput
                id="edit-user-refresh-limit"
                eyebrow={t('advancedOverrides.manualRefreshPerHour')}
                min={0}
                type="number"
                value={maxManualRefreshesPerHour}
                onChange={(e) => setMaxManualRefreshesPerHour(e.target.value)}
              />
              <FormGroup>
                <Label htmlFor="edit-user-track-stats">{t('advancedOverrides.trackStats')}</Label>
                <Select
                  id="edit-user-track-stats"
                  className={fieldPrimitiveClasses.select}
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
                </Select>
              </FormGroup>
              <FormGroup>
                <Label htmlFor="edit-user-notifications">
                  {t('advancedOverrides.allowNotifications')}
                </Label>
                <Select
                  id="edit-user-notifications"
                  className={fieldPrimitiveClasses.select}
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
                </Select>
              </FormGroup>
            </>
          )}

          <FormPrimaryActions>
            <ActionLink href={`/users/${userId}`} variant="subtle" LinkComponent={Link}>
              {tc('cancel')}
            </ActionLink>
            <Button type="submit" disabled={saving}>
              {saving ? tc('saving') : tc('saveChanges')}
            </Button>
          </FormPrimaryActions>
        </FormContainer>
      ) : (
        <FormContainer onSubmit={(e) => void handlePasswordSubmit(e)}>
          {passwordError && <Alert>{passwordError}</Alert>}

          <TextInput
            autoComplete="new-password"
            id="edit-user-new-password"
            eyebrow={ta('newPassword')}
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />

          <TextInput
            autoComplete="new-password"
            id="edit-user-confirm-password"
            eyebrow={ta('confirmPassword')}
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <FormPrimaryActions>
            <ActionLink href={`/users/${userId}`} variant="subtle" LinkComponent={Link}>
              {tc('cancel')}
            </ActionLink>
            <Button type="submit" disabled={saving}>
              {saving ? tc('saving') : tc('saveChanges')}
            </Button>
          </FormPrimaryActions>
        </FormContainer>
      )}
    </ManagementPageShell>
  );
}
