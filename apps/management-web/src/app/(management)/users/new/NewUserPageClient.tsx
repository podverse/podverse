'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { PremiumBillingCadence, ResolvedProductMembership } from '@podverse/helpers';
import { AccountMembershipEnum } from '@podverse/helpers';
import type { FormDropdownOption } from '@podverse/ui';
import {
  Alert,
  Breadcrumbs,
  Button,
  CheckboxField,
  CopyToClipboardButton,
  FormDropdown,
  FormGroup,
  FormHintText,
  FormMaxWidth,
  FormPrimaryActions,
  FormStack,
  ManagementPageShell,
  StackForm,
  TextInput,
} from '@podverse/ui';

import { ManagementLoadingSpinnerOverlay } from '../../../../components/LoadingSpinner/ManagementLoadingSpinnerOverlay';
import { MembershipAdvancedOverridesGroup } from '../../../../components/MembershipAdvancedOverridesGroup/MembershipAdvancedOverridesGroup';
import {
  computeDefaultExpiryInput,
  fallbackProductMembershipFromEnv,
  resolveAdvancedOverrideDefaults,
  resolvedTierEntitlements,
  STORAGE_CADENCE_KEY,
  STORAGE_EXPIRY_KEY,
  tierLimitPlaceholders,
} from '../../../../lib/createUserFormDefaults';
import { getResolvedProductMembership } from '../../../../lib/requests/productMembership';
import { createUser } from '../../../../lib/requests/users';

const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function NewUserPageClient() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [membershipId, setMembershipId] = useState(AccountMembershipEnum.Trial);
  const [premiumCadence, setPremiumCadence] = useState<PremiumBillingCadence>('annual');
  const [membershipExpiresAt, setMembershipExpiresAt] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [allowDirectoryAddByRSS, setAllowDirectoryAddByRSS] = useState<boolean | null>(null);
  const [maxAddByRSSFeeds, setMaxAddByRSSFeeds] = useState<string>('');
  const [maxManualRefreshesPerHour, setMaxManualRefreshesPerHour] = useState<string>('');
  const [trackStats, setTrackStats] = useState<boolean | null>(null);
  const [allowNotifications, setAllowNotifications] = useState<boolean | null>(null);
  const [resolvedProductMembership, setResolvedProductMembership] =
    useState<ResolvedProductMembership | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const skipTierCadenceEffect = useRef(true);

  const t = useTranslations('users');
  const tc = useTranslations('common');
  const tNav = useTranslations('nav');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await getResolvedProductMembership();
        if (!cancelled) {
          setResolvedProductMembership(res.data);
        }
      } catch {
        if (!cancelled) {
          setResolvedProductMembership(fallbackProductMembershipFromEnv());
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!resolvedProductMembership) {
      return;
    }
    const cadRaw = window.localStorage.getItem(STORAGE_CADENCE_KEY);
    const cad: PremiumBillingCadence = cadRaw === 'monthly' ? 'monthly' : 'annual';
    setPremiumCadence(cad);
    const savedExp = window.localStorage.getItem(STORAGE_EXPIRY_KEY);
    if (savedExp !== null && savedExp.includes('T')) {
      setMembershipExpiresAt(savedExp);
    } else {
      setMembershipExpiresAt(
        computeDefaultExpiryInput({
          membershipId: AccountMembershipEnum.Trial,
          premiumCadence: cad,
          trialExpirationSeconds: resolvedProductMembership.freeTrialExpirationSeconds,
        })
      );
    }
    setHydrated(true);
  }, [resolvedProductMembership]);

  useEffect(() => {
    if (!hydrated || !resolvedProductMembership) {
      return;
    }
    if (skipTierCadenceEffect.current) {
      skipTierCadenceEffect.current = false;
      return;
    }
    setMembershipExpiresAt(
      computeDefaultExpiryInput({
        membershipId,
        premiumCadence,
        trialExpirationSeconds: resolvedProductMembership.freeTrialExpirationSeconds,
      })
    );
  }, [membershipId, premiumCadence, hydrated, resolvedProductMembership]);

  useEffect(() => {
    if (!hydrated || membershipExpiresAt.trim() === '') {
      return;
    }
    window.localStorage.setItem(STORAGE_EXPIRY_KEY, membershipExpiresAt);
  }, [membershipExpiresAt, hydrated]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    window.localStorage.setItem(STORAGE_CADENCE_KEY, premiumCadence);
  }, [premiumCadence, hydrated]);

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

  const membershipTierOptions = useMemo<FormDropdownOption[]>(
    () => [
      { value: String(AccountMembershipEnum.Trial), label: t('membershipForm.trial') },
      { value: String(AccountMembershipEnum.Premium), label: t('membershipForm.premium') },
    ],
    [t]
  );

  const premiumCadenceOptions = useMemo<FormDropdownOption[]>(
    () => [
      { value: 'monthly', label: t('membershipForm.billingMonthly') },
      { value: 'annual', label: t('membershipForm.billingAnnual') },
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
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
        ...(membershipId === AccountMembershipEnum.Premium
          ? { premium_billing_cadence: premiumCadence }
          : {}),
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
        setUsername('');
        setEmail('');
        setPassword('');
      } else {
        router.push('/users');
        router.refresh();
      }
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

  const createUserBreadcrumbs = (
    <Breadcrumbs
      LinkComponent={Link}
      navAriaLabel={tc('breadcrumbNav')}
      items={[
        { href: '/dashboard', label: tNav('dashboard') },
        { href: '/users', label: t('title') },
        { label: tc('new') },
      ]}
    />
  );

  if (!resolvedProductMembership || !hydrated) {
    return (
      <ManagementPageShell headerBreadcrumbs={createUserBreadcrumbs} title={t('createUser')}>
        <ManagementLoadingSpinnerOverlay isLoading />
      </ManagementPageShell>
    );
  }

  if (inviteLink !== null) {
    return (
      <ManagementPageShell headerBreadcrumbs={createUserBreadcrumbs} title={t('createUser')}>
        <FormMaxWidth>
          <FormStack>
            <Alert variant="success">{t('createdWithLink')}</Alert>
            <FormGroup layout="inStack">
              <div
                style={{
                  display: 'flex',
                  gap: 'var(--spacing-base)',
                  alignItems: 'flex-end',
                }}
              >
                <TextInput
                  eyebrow={t('inviteLinkLabel')}
                  id="invite-link"
                  readOnly
                  style={{ flex: 1, minWidth: 0 }}
                  type="text"
                  value={inviteLink}
                />
                <CopyToClipboardButton
                  textToCopy={inviteLink}
                  idleLabel={t('copyLink')}
                  copiedLabel={t('linkCopied')}
                />
              </div>
            </FormGroup>
            <FormPrimaryActions>
              <Button type="button" variant="secondary" onClick={() => router.push('/users')}>
                {t('backToList')}
              </Button>
            </FormPrimaryActions>
          </FormStack>
        </FormMaxWidth>
      </ManagementPageShell>
    );
  }

  return (
    <ManagementPageShell headerBreadcrumbs={createUserBreadcrumbs} title={t('createUser')}>
      <FormMaxWidth>
        <StackForm onSubmit={(e) => void handleSubmit(e)}>
          <TextInput
            id="username"
            autoComplete="off"
            eyebrow={t('usernameOptional')}
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <TextInput
            id="email"
            autoComplete="off"
            eyebrow={t('emailOptional')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <FormHintText variant="block">{t('emailOrUsernameHint')}</FormHintText>
          <TextInput
            id="password"
            autoComplete="new-password"
            eyebrow={t('passwordOptional')}
            info={t('passwordInviteHint')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <FormGroup layout="inStack">
            <FormDropdown
              id="membership-id"
              info={
                membershipId === AccountMembershipEnum.Trial
                  ? t('membershipForm.hintTrialNew')
                  : t('membershipForm.hintPremiumNew')
              }
              eyebrow={t('membershipForm.membershipStatus')}
              options={membershipTierOptions}
              value={String(membershipId)}
              onChange={(v) => {
                const parsed = Number.parseInt(v, 10);
                if (
                  parsed === AccountMembershipEnum.Trial ||
                  parsed === AccountMembershipEnum.Premium
                ) {
                  setMembershipId(parsed);
                }
              }}
            />
          </FormGroup>
          {membershipId === AccountMembershipEnum.Premium && (
            <FormGroup layout="inStack">
              <FormDropdown
                id="premium-cadence"
                info={t('membershipForm.premiumBillingCadenceHint')}
                eyebrow={t('membershipForm.premiumBillingCadence')}
                options={premiumCadenceOptions}
                value={premiumCadence}
                onChange={(v) => {
                  setPremiumCadence(v === 'monthly' ? 'monthly' : 'annual');
                }}
              />
            </FormGroup>
          )}
          <TextInput
            id="membership-expires-at"
            eyebrow={t('membershipForm.membershipExpiresAt')}
            nativePickerAffixAriaLabel={t('membershipForm.membershipExpiresAtPickerAffix')}
            type="datetime-local"
            value={membershipExpiresAt}
            onChange={(e) => setMembershipExpiresAt(e.target.value)}
          />
          <MembershipAdvancedOverridesGroup>
            <FormGroup layout="inStack">
              <CheckboxField
                label={t('membershipForm.configureAdvancedOverrides')}
                checked={showAdvanced}
                onChange={setShowAdvanced}
              />
            </FormGroup>
            {showAdvanced && (
              <>
                <FormGroup layout="inStack">
                  <FormDropdown
                    id="allow-directory-add"
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
                  id="max-add-by-rss-feeds"
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
                  id="max-manual-refreshes"
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
                    id="track-stats"
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
                    id="allow-notifications"
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
                    value={allowNotifications === null ? '' : allowNotifications ? 'true' : 'false'}
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
          <Alert>{error}</Alert>
          <FormPrimaryActions>
            <Button type="button" variant="secondary" onClick={() => router.push('/users')}>
              {tc('cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? tc('creating') : t('createUser')}
            </Button>
          </FormPrimaryActions>
        </StackForm>
      </FormMaxWidth>
    </ManagementPageShell>
  );
}
