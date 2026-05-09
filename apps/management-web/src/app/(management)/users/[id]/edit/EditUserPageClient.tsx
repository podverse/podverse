'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import type { ResolvedProductMembership } from '@podverse/helpers';
import { AccountMembershipEnum, toDatetimeLocalInputValue } from '@podverse/helpers';
import type { FormDropdownOption } from '@podverse/ui';
import {
  Alert,
  Breadcrumbs,
  Button,
  CheckboxField,
  FormDropdown,
  FormGroup,
  FormMaxWidth,
  FormPrimaryActions,
  ManagementPageShell,
  StackForm,
  Tabs,
  TextInput,
} from '@podverse/ui';

import { ManagementLoadingSpinnerOverlay } from '../../../../../components/LoadingSpinner/ManagementLoadingSpinnerOverlay';
import { MembershipAdvancedOverridesGroup } from '../../../../../components/MembershipAdvancedOverridesGroup/MembershipAdvancedOverridesGroup';
import {
  fallbackProductMembershipFromEnv,
  resolveAdvancedOverrideDefaults,
  resolvedTierEntitlements,
  tierLimitPlaceholders,
} from '../../../../../lib/createUserFormDefaults';
import { getResolvedProductMembership } from '../../../../../lib/requests/productMembership';
import { getUser, setUserPassword, updateUser, type User } from '../../../../../lib/requests/users';

type Props = {
  userId: number;
  initialTab?: string;
};

export function EditUserPageClient({ userId, initialTab }: Props) {
  const router = useRouter();
  const t = useTranslations('users');
  const ta = useTranslations('auth');
  const tc = useTranslations('common');
  const tNav = useTranslations('nav');

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
  const [resolvedProductMembership, setResolvedProductMembership] =
    useState<ResolvedProductMembership | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const activeTab = initialTab === 'password' ? 'password' : 'profile';
  const productMembershipForDisplay =
    resolvedProductMembership ?? fallbackProductMembershipFromEnv();
  const currentMembershipExpiresAt = membershipExpiresAt.trim() === '' ? null : membershipExpiresAt;
  const trialEnt = resolvedTierEntitlements(
    productMembershipForDisplay,
    AccountMembershipEnum.Trial
  );
  const premiumEnt = resolvedTierEntitlements(
    productMembershipForDisplay,
    AccountMembershipEnum.Premium
  );
  const selectedEnt = resolveAdvancedOverrideDefaults({
    product: productMembershipForDisplay,
    membershipId,
    membershipExpiresAt: currentMembershipExpiresAt,
  });
  const { rss: rssPlaceholder, refresh: refreshPlaceholder } = tierLimitPlaceholders({
    product: productMembershipForDisplay,
    membershipId,
    membershipExpiresAt: currentMembershipExpiresAt,
  });

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

  const membershipTierOptions = useMemo<FormDropdownOption[]>(
    () => [
      { value: String(AccountMembershipEnum.Trial), label: t('membershipForm.trial') },
      { value: String(AccountMembershipEnum.Premium), label: t('membershipForm.premium') },
    ],
    [t]
  );

  const addByRssTriOptions = useMemo<FormDropdownOption[]>(
    () => [
      {
        value: '',
        label: t('advancedOverrides.useTrustTierDefault', {
          value: selectedEnt.allowDirectoryAddByRSS
            ? t('advancedOverrides.allow')
            : t('advancedOverrides.block'),
        }),
      },
      { value: 'true', label: t('advancedOverrides.allow') },
      { value: 'false', label: t('advancedOverrides.block') },
    ],
    [selectedEnt.allowDirectoryAddByRSS, t]
  );

  const trackStatsTriOptions = useMemo<FormDropdownOption[]>(
    () => [
      {
        value: '',
        label: t('advancedOverrides.useTrustTierDefault', {
          value: selectedEnt.trackStats
            ? t('advancedOverrides.trackStatsOn')
            : t('advancedOverrides.trackStatsOff'),
        }),
      },
      { value: 'true', label: t('advancedOverrides.trackStatsOn') },
      { value: 'false', label: t('advancedOverrides.trackStatsOff') },
    ],
    [selectedEnt.trackStats, t]
  );

  const notificationsTriOptions = useMemo<FormDropdownOption[]>(
    () => [
      {
        value: '',
        label: t('advancedOverrides.useTrustTierDefault', {
          value: selectedEnt.allowNotifications
            ? t('advancedOverrides.allowNotificationsOn')
            : t('advancedOverrides.allowNotificationsOff'),
        }),
      },
      { value: 'true', label: t('advancedOverrides.allowNotificationsOn') },
      { value: 'false', label: t('advancedOverrides.allowNotificationsOff') },
    ],
    [selectedEnt.allowNotifications, t]
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [result, productResult] = await Promise.all([
          getUser(userId),
          getResolvedProductMembership().catch(() => ({
            data: fallbackProductMembershipFromEnv(),
          })),
        ]);
        if (!cancelled) {
          setUser(result.user);
          setResolvedProductMembership(productResult.data);
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
      await setUserPassword(userId, newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setSuccess(t('passwordChanged'));
    } catch {
      setError(t('failedToUpdate'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ManagementLoadingSpinnerOverlay isLoading={loading} />
      {!loading && error && !user ? (
        <Alert>{error}</Alert>
      ) : !loading && !user ? null : !loading && user ? (
        <ManagementPageShell
          headerBreadcrumbs={
            <Breadcrumbs
              LinkComponent={Link}
              navAriaLabel={tc('breadcrumbNav')}
              items={[
                { href: '/dashboard', label: tNav('dashboard') },
                { href: '/users', label: t('title') },
                { href: `/users/${userId}`, label: user.id_text },
                { label: tc('edit') },
              ]}
            />
          }
          title={t('editUser')}
        >
          <Tabs selectedKey={activeTab} tabData={tabData} />

          <Alert>{error}</Alert>
          {success && <Alert variant="success">{success}</Alert>}

          {activeTab === 'profile' ? (
            <FormMaxWidth>
              <StackForm onSubmit={(e) => void handleProfileSubmit(e)}>
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

                <FormGroup layout="inStack">
                  <CheckboxField
                    checked={verified}
                    label={t('verified')}
                    onChange={(checked) => setVerified(checked)}
                  />
                </FormGroup>

                <FormGroup layout="inStack">
                  <FormDropdown
                    id="edit-user-membership"
                    info={
                      membershipId === 1
                        ? t('membershipForm.hintTrialEdit')
                        : t('membershipForm.hintPremiumEdit')
                    }
                    eyebrow={t('membershipForm.membershipStatus')}
                    options={membershipTierOptions}
                    value={String(membershipId)}
                    onChange={(v) => {
                      setMembershipId(Number(v));
                    }}
                  />
                </FormGroup>

                <TextInput
                  id="edit-user-expires"
                  eyebrow={t('membershipForm.membershipExpiresAt')}
                  nativePickerAffixAriaLabel={t('membershipForm.membershipExpiresAtPickerAffix')}
                  type="datetime-local"
                  value={membershipExpiresAt}
                  onChange={(e) => setMembershipExpiresAt(e.target.value)}
                />

                <MembershipAdvancedOverridesGroup>
                  <FormGroup layout="inStack">
                    <CheckboxField
                      checked={showAdvanced}
                      label={t('membershipForm.configureAdvancedOverrides')}
                      onChange={(checked) => setShowAdvanced(checked)}
                    />
                  </FormGroup>

                  {showAdvanced && (
                    <>
                      <FormGroup layout="inStack">
                        <FormDropdown
                          id="edit-user-add-by-rss"
                          eyebrow={t('advancedOverrides.allowDirectoryAddByRss')}
                          info={t('advancedOverrides.allowDirectoryAddByRssHelp', {
                            trialDefault: trialEnt.allowDirectoryAddByRSS
                              ? t('advancedOverrides.on')
                              : t('advancedOverrides.off'),
                            premiumDefault: premiumEnt.allowDirectoryAddByRSS
                              ? t('advancedOverrides.on')
                              : t('advancedOverrides.off'),
                          })}
                          options={addByRssTriOptions}
                          value={
                            allowDirectoryAddByRSS === null
                              ? ''
                              : allowDirectoryAddByRSS
                                ? 'true'
                                : 'false'
                          }
                          onChange={(v) => {
                            if (v === '') {
                              setAllowDirectoryAddByRSS(null);
                            } else {
                              setAllowDirectoryAddByRSS(v === 'true');
                            }
                          }}
                        />
                      </FormGroup>
                      <TextInput
                        id="edit-user-rss-limit"
                        eyebrow={t('advancedOverrides.addByRssFeedLimit')}
                        info={t('advancedOverrides.addByRssFeedLimitHelp', {
                          trialDefault: trialEnt.maxAddByRSSFeeds,
                          premiumDefault: premiumEnt.maxAddByRSSFeeds,
                          selectedDefault: selectedEnt.maxAddByRSSFeeds,
                        })}
                        min={0}
                        placeholder={t('advancedOverrides.placeholderTierDefault', {
                          count: rssPlaceholder,
                        })}
                        type="number"
                        value={maxAddByRSSFeeds}
                        onChange={(e) => setMaxAddByRSSFeeds(e.target.value)}
                      />
                      <TextInput
                        id="edit-user-refresh-limit"
                        eyebrow={t('advancedOverrides.manualRefreshPerHour')}
                        info={t('advancedOverrides.manualRefreshPerHourHelp', {
                          trialDefault: trialEnt.maxManualRefreshesPerHour,
                          premiumDefault: premiumEnt.maxManualRefreshesPerHour,
                          selectedDefault: selectedEnt.maxManualRefreshesPerHour,
                        })}
                        min={0}
                        placeholder={t('advancedOverrides.placeholderTierDefault', {
                          count: refreshPlaceholder,
                        })}
                        type="number"
                        value={maxManualRefreshesPerHour}
                        onChange={(e) => setMaxManualRefreshesPerHour(e.target.value)}
                      />
                      <FormGroup layout="inStack">
                        <FormDropdown
                          id="edit-user-track-stats"
                          eyebrow={t('advancedOverrides.trackStats')}
                          info={t('advancedOverrides.trackStatsHelp', {
                            trialDefault: trialEnt.trackStats
                              ? t('advancedOverrides.on')
                              : t('advancedOverrides.off'),
                            premiumDefault: premiumEnt.trackStats
                              ? t('advancedOverrides.on')
                              : t('advancedOverrides.off'),
                          })}
                          options={trackStatsTriOptions}
                          value={trackStats === null ? '' : trackStats ? 'true' : 'false'}
                          onChange={(v) => {
                            if (v === '') {
                              setTrackStats(null);
                            } else {
                              setTrackStats(v === 'true');
                            }
                          }}
                        />
                      </FormGroup>
                      <FormGroup layout="inStack">
                        <FormDropdown
                          id="edit-user-notifications"
                          eyebrow={t('advancedOverrides.allowNotifications')}
                          info={t('advancedOverrides.allowNotificationsHelp', {
                            trialDefault: trialEnt.allowNotifications
                              ? t('advancedOverrides.on')
                              : t('advancedOverrides.off'),
                            premiumDefault: premiumEnt.allowNotifications
                              ? t('advancedOverrides.on')
                              : t('advancedOverrides.off'),
                          })}
                          options={notificationsTriOptions}
                          value={
                            allowNotifications === null ? '' : allowNotifications ? 'true' : 'false'
                          }
                          onChange={(v) => {
                            if (v === '') {
                              setAllowNotifications(null);
                            } else {
                              setAllowNotifications(v === 'true');
                            }
                          }}
                        />
                      </FormGroup>
                    </>
                  )}
                </MembershipAdvancedOverridesGroup>

                <FormPrimaryActions>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => router.push(`/users/${userId}`)}
                  >
                    {tc('cancel')}
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? tc('saving') : tc('saveChanges')}
                  </Button>
                </FormPrimaryActions>
              </StackForm>
            </FormMaxWidth>
          ) : (
            <FormMaxWidth>
              <StackForm onSubmit={(e) => void handlePasswordSubmit(e)}>
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
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => router.push(`/users/${userId}`)}
                  >
                    {tc('cancel')}
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? tc('saving') : tc('saveChanges')}
                  </Button>
                </FormPrimaryActions>
              </StackForm>
            </FormMaxWidth>
          )}
        </ManagementPageShell>
      ) : null}
    </>
  );
}
