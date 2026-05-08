'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import type { PremiumBillingCadence, ResolvedProductMembership } from '@podverse/helpers';
import { AccountMembershipEnum } from '@podverse/helpers';
import {
  Alert,
  Breadcrumbs,
  Button,
  CheckboxField,
  CopyToClipboardButton,
  fieldPrimitiveClasses,
  FormGroup,
  FormHintText,
  FormMaxWidth,
  FormPrimaryActions,
  FormStack,
  Input,
  Label,
  ManagementPageShell,
  Select,
  StackForm,
  TextInput,
} from '@podverse/ui';

import { ManagementLoadingSpinnerFull } from '../../../../components/LoadingSpinner/ManagementLoadingSpinnerFull';
import {
  computeDefaultExpiryInput,
  fallbackProductMembershipFromEnv,
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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
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

  const trialEnt = resolvedTierEntitlements(AccountMembershipEnum.Trial);
  const premiumEnt = resolvedTierEntitlements(AccountMembershipEnum.Premium);
  const selectedEnt = resolvedTierEntitlements(membershipId);

  const { rss: rssPlaceholder, refresh: refreshPlaceholder } = resolvedProductMembership
    ? tierLimitPlaceholders(resolvedProductMembership, membershipId)
    : { rss: 0, refresh: 0 };

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

  const createUserBreadcrumbs = (
    <Breadcrumbs
      LinkComponent={Link}
      navAriaLabel={tc('breadcrumbNav')}
      items={[{ href: '/users', label: t('title') }, { label: tc('new') }]}
    />
  );

  if (!resolvedProductMembership) {
    return (
      <ManagementPageShell headerChildren={createUserBreadcrumbs} title={t('createUser')}>
        <ManagementLoadingSpinnerFull />
      </ManagementPageShell>
    );
  }

  if (inviteLink !== null) {
    return (
      <ManagementPageShell headerChildren={createUserBreadcrumbs} title={t('createUser')}>
        <FormMaxWidth>
          <FormStack>
            <Alert variant="success">{t('createdWithLink')}</Alert>
            <FormGroup layout="inStack">
              <Label htmlFor="invite-link">{t('inviteLinkLabel')}</Label>
              <div
                style={{
                  display: 'flex',
                  gap: 'var(--spacing-base)',
                  alignItems: 'center',
                }}
              >
                <Input
                  id="invite-link"
                  readOnly
                  type="text"
                  className={fieldPrimitiveClasses.input}
                  style={{ flex: 1, minWidth: 0 }}
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
    <ManagementPageShell headerChildren={createUserBreadcrumbs} title={t('createUser')}>
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
            <Label htmlFor="membership-id">{t('membershipForm.membershipStatus')}</Label>
            <Select
              id="membership-id"
              className={fieldPrimitiveClasses.select}
              value={String(membershipId)}
              onChange={(e) => {
                const v = Number.parseInt(e.target.value, 10);
                if (v === AccountMembershipEnum.Trial || v === AccountMembershipEnum.Premium) {
                  setMembershipId(v);
                }
              }}
            >
              <option value={String(AccountMembershipEnum.Trial)}>
                {t('membershipForm.trial')}
              </option>
              <option value={String(AccountMembershipEnum.Premium)}>
                {t('membershipForm.premium')}
              </option>
            </Select>
            <FormHintText>
              {membershipId === AccountMembershipEnum.Trial
                ? t('membershipForm.hintTrialNew')
                : t('membershipForm.hintPremiumNew')}
            </FormHintText>
          </FormGroup>
          {membershipId === AccountMembershipEnum.Premium && (
            <FormGroup layout="inStack">
              <Label htmlFor="premium-cadence">{t('membershipForm.premiumBillingCadence')}</Label>
              <Select
                id="premium-cadence"
                className={fieldPrimitiveClasses.select}
                value={premiumCadence}
                onChange={(e) => {
                  setPremiumCadence(e.target.value === 'monthly' ? 'monthly' : 'annual');
                }}
              >
                <option value="monthly">{t('membershipForm.billingMonthly')}</option>
                <option value="annual">{t('membershipForm.billingAnnual')}</option>
              </Select>
              <FormHintText>{t('membershipForm.premiumBillingCadenceHint')}</FormHintText>
            </FormGroup>
          )}
          <TextInput
            id="membership-expires-at"
            eyebrow={t('membershipForm.membershipExpiresAt')}
            type="datetime-local"
            value={membershipExpiresAt}
            onChange={(e) => setMembershipExpiresAt(e.target.value)}
          />
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
                <Label htmlFor="allow-directory-add">
                  {t('advancedOverrides.allowDirectoryAddByRss')}
                </Label>
                <Select
                  id="allow-directory-add"
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
                <FormHintText>
                  {t('advancedOverrides.allowDirectoryAddByRssHelp', {
                    trialDefault: trialEnt.allowDirectoryAddByRSS
                      ? t('advancedOverrides.on')
                      : t('advancedOverrides.off'),
                    premiumDefault: premiumEnt.allowDirectoryAddByRSS
                      ? t('advancedOverrides.on')
                      : t('advancedOverrides.off'),
                  })}
                </FormHintText>
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
                <Label htmlFor="track-stats">{t('advancedOverrides.trackStats')}</Label>
                <Select
                  id="track-stats"
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
                <FormHintText>
                  {t('advancedOverrides.trackStatsHelp', {
                    trialDefault: trialEnt.trackStats
                      ? t('advancedOverrides.on')
                      : t('advancedOverrides.off'),
                    premiumDefault: premiumEnt.trackStats
                      ? t('advancedOverrides.on')
                      : t('advancedOverrides.off'),
                  })}
                </FormHintText>
              </FormGroup>
              <FormGroup layout="inStack">
                <Label htmlFor="allow-notifications">
                  {t('advancedOverrides.allowNotifications')}
                </Label>
                <Select
                  id="allow-notifications"
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
                <FormHintText>
                  {t('advancedOverrides.allowNotificationsHelp', {
                    trialDefault: trialEnt.allowNotifications
                      ? t('advancedOverrides.on')
                      : t('advancedOverrides.off'),
                    premiumDefault: premiumEnt.allowNotifications
                      ? t('advancedOverrides.on')
                      : t('advancedOverrides.off'),
                  })}
                </FormHintText>
              </FormGroup>
            </>
          )}
          <Alert>{error}</Alert>
          {successMessage && <Alert variant="success">{successMessage}</Alert>}
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
