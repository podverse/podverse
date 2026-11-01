'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import type { DTOAccountApiKey } from '@podverse/helpers';
import {
  APP_ROUTES,
  deriveMembershipState,
  formatApiKeyTokenHint,
  formatDateTimeAbbrev,
  getErrorResponseStatus,
  isApiKeyExpired,
  membershipPurchaseAction,
  membershipPurchaseMessageKey,
} from '@podverse/helpers';
import { Button, DescribedLink, Divider, FormStack, LoadingSpinner } from '@podverse/ui';

import { useAccount } from '../../../../contexts/Account';
import { useModals } from '../../../../contexts/Modals';
import { getApiRequestService, getClientApiBaseUrl } from '../../../../factories/apiRequestService';
import { useMembershipGate } from '../../../../hooks/useMembershipGate';
import { handleRateLimitAlert } from '../../../../utils/rateLimit/rateLimitAlert';
import { NoResults } from '../../../NoResults/NoResults';
import { showToast } from '../../../Toast/Toast';
import { SettingsSection } from '../../SettingsSection';
import type {
  ApiKeyActionLabelKey,
  ApiKeyPermissionSummary,
  ApiKeyPresetLabelKey,
  ApiKeyResourceLabelKey,
} from './apiKeyDisplay';
import {
  apiDocsUrl,
  apiDocsYamlUrl,
  apiKeyActionLabelKey,
  apiKeyPresetLabelKey,
  apiKeyResourceLabelKey,
  summarizeApiKeyPermissions,
} from './apiKeyDisplay';
import { ModalCreateApiKey } from './ModalCreateApiKey';
import { ModalRevokeApiKey } from './ModalRevokeApiKey';

import styles from '../../../../styles/components/Settings/Panels/SettingsDeveloper/SettingsDeveloper.module.scss';

type LoadState =
  { status: 'loading' } | { status: 'error' } | { status: 'ready'; rows: DTOAccountApiKey[] };

type RevokeTarget = {
  idText: string;
  name: string;
};

type DeveloperLabelKey =
  ApiKeyPresetLabelKey | ApiKeyResourceLabelKey | ApiKeyActionLabelKey | 'preset_custom';

function withCreatedKey(rows: DTOAccountApiKey[], created: DTOAccountApiKey): DTOAccountApiKey[] {
  if (rows.some((row) => row.id_text === created.id_text)) {
    return rows;
  }
  return [created, ...rows];
}

function permissionSummaryText(
  summary: ApiKeyPermissionSummary,
  translate: (key: DeveloperLabelKey) => string
): string {
  if (summary.kind === 'preset') {
    return translate(apiKeyPresetLabelKey(summary.presetId));
  }
  if (summary.lines.length === 0) {
    return translate('preset_custom');
  }
  return summary.lines
    .map((line) => {
      const actions = line.actions
        .map((action) => translate(apiKeyActionLabelKey(action)))
        .join(', ');
      return `${translate(apiKeyResourceLabelKey(line.resource))} ${actions}`;
    })
    .join(' · ');
}

export function SettingsDeveloper() {
  const t = useTranslations('settings.developer');
  const tMembership = useTranslations('membership');
  const tMisc = useTranslations('misc');
  const locale = useLocale();
  const { loggedInAccount } = useAccount();
  const { setModalLoginRequired } = useModals();
  const { tryHandleMembershipGateError } = useMembershipGate();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const stateRef = useRef(state);
  stateRef.current = state;
  const [reloadToken, setReloadToken] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<RevokeTarget | null>(null);
  const [revokingIds, setRevokingIds] = useState<ReadonlySet<string>>(() => new Set());
  const revokingIdsRef = useRef(new Set<string>());
  const apiBaseUrl = getClientApiBaseUrl();

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    void (async () => {
      try {
        const rows = await getApiRequestService().reqAuthApiKeys();
        if (!cancelled) {
          setState({ status: 'ready', rows });
        }
      } catch (error) {
        console.warn('Could not load API keys', error);
        if (!cancelled) {
          setState({ status: 'error' });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const setRevoking = (idText: string, revoking: boolean) => {
    if (revoking) {
      revokingIdsRef.current.add(idText);
    } else {
      revokingIdsRef.current.delete(idText);
    }
    setRevokingIds(new Set(revokingIdsRef.current));
  };

  const removeKey = (idText: string) => {
    setState((current) => {
      if (current.status !== 'ready') {
        return current;
      }
      return {
        status: 'ready',
        rows: current.rows.filter((row) => row.id_text !== idText),
      };
    });
  };

  const handleRevoke = async () => {
    if (revokeTarget === null) {
      return;
    }
    const { idText } = revokeTarget;
    if (revokingIdsRef.current.has(idText)) {
      return;
    }
    setRevoking(idText, true);
    try {
      await getApiRequestService().reqAuthApiKeyRevoke(idText);
      removeKey(idText);
      setRevokeTarget(null);
      showToast(t('revoke_success'), 'success');
    } catch (error: unknown) {
      if (getErrorResponseStatus(error) === 404) {
        removeKey(idText);
        setRevokeTarget(null);
        return;
      }
      const rateLimitErrorHandled = await handleRateLimitAlert(error, locale, tMisc);
      if (!rateLimitErrorHandled) {
        showToast(t('revoke_error'), 'error');
      }
    } finally {
      setRevoking(idText, false);
    }
  };

  const translate = (key: DeveloperLabelKey) => t(key);

  const handleCreated = (createdKey: DTOAccountApiKey) => {
    const current = stateRef.current;
    if (current.status === 'ready') {
      setState({
        status: 'ready',
        rows: withCreatedKey(current.rows, createdKey),
      });
      return;
    }
    setReloadToken((token) => token + 1);
  };

  const openCreate = () => {
    const membership = deriveMembershipState(loggedInAccount);
    if (membership.isExpired) {
      tryHandleMembershipGateError({
        response: {
          status: 403,
          data: {
            code: 'membership_expired',
            i18nKey: 'membership.membership_expired',
            renewPath: APP_ROUTES.MEMBERSHIP_RENEW,
          },
        },
      });
      return;
    }
    if (!membership.isMember) {
      setModalLoginRequired({
        title: t('membership_required'),
        message: t('membership_required_body'),
        messageNode: null,
        actionLabel: tMembership(
          membershipPurchaseMessageKey(membershipPurchaseAction(membership))
        ),
        actionHref: APP_ROUTES.MEMBERSHIP_RENEW,
      });
      return;
    }
    setCreateOpen(true);
  };

  return (
    <SettingsSection>
      <FormStack>
        <h3 className={styles.heading} id="settings-api-keys-heading">
          {t('heading')}
        </h3>
        <p>{t('description')}</p>
        <p>{t('key_cannot')}</p>
        <DescribedLink
          description={t('api_reference_hint')}
          href={apiDocsUrl(apiBaseUrl)}
          rel="noopener noreferrer"
          target="_blank"
          title={t('api_reference')}
        />
        <DescribedLink
          description={t('api_spec_hint')}
          href={apiDocsYamlUrl(apiBaseUrl)}
          rel="noopener noreferrer"
          target="_blank"
          title={t('api_spec')}
        />
        <Divider />
        <Button className={styles.action} type="button" variant="primary" onClick={openCreate}>
          {t('create')}
        </Button>
        {state.status === 'loading' ? (
          <LoadingSpinner ariaLabel={tMisc('loading')} size="medium" />
        ) : null}
        {state.status === 'error' ? (
          <>
            <p role="alert">{t('load_error')}</p>
            <Button
              className={styles.action}
              type="button"
              variant="secondary"
              onClick={() => setReloadToken((token) => token + 1)}
            >
              {tMisc('try_again')}
            </Button>
          </>
        ) : null}
        {state.status === 'ready' && state.rows.length === 0 ? (
          <NoResults message={t('empty')} role="status" />
        ) : null}
        {state.status === 'ready' && state.rows.length > 0 ? (
          <ul className={styles.rows} aria-labelledby="settings-api-keys-heading">
            {state.rows.map((row) => {
              const revoking = revokingIds.has(row.id_text);
              const expired = isApiKeyExpired(row.expires_at, new Date());
              return (
                <li key={row.id_text} className={styles.row}>
                  <div className={styles.rowText}>
                    <span className={styles.name}>{row.name}</span>
                    <span className={styles.meta}>{formatApiKeyTokenHint(row.token_hint)}</span>
                    <span className={styles.meta}>
                      {permissionSummaryText(
                        summarizeApiKeyPermissions(row.permissions),
                        translate
                      )}
                    </span>
                    <span className={styles.meta}>
                      {t('created', { date: formatDateTimeAbbrev(row.created_at, locale) })}
                    </span>
                    <span className={styles.meta}>
                      {row.expires_at === null
                        ? t('no_expiration')
                        : t('expires', { date: formatDateTimeAbbrev(row.expires_at, locale) })}
                    </span>
                    {expired ? <span className={styles.meta}>{t('expired')}</span> : null}
                    <span className={styles.meta}>
                      {row.last_used_at === null
                        ? t('never_used')
                        : t('last_used', { date: formatDateTimeAbbrev(row.last_used_at, locale) })}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    aria-label={t('revoke_aria', { name: row.name })}
                    isLoading={revoking}
                    disabled={revoking}
                    onClick={() => {
                      if (revokingIdsRef.current.size > 0) {
                        return;
                      }
                      setRevokeTarget({ idText: row.id_text, name: row.name });
                    }}
                  >
                    {t('revoke')}
                  </Button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </FormStack>
      <ModalCreateApiKey
        isOpen={createOpen}
        existingKeyCount={state.status === 'ready' ? state.rows.length : null}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
      {state.status === 'ready' ? (
        <ModalRevokeApiKey
          isOpen={revokeTarget !== null}
          isSubmitting={revokeTarget !== null && revokingIds.has(revokeTarget.idText)}
          name={revokeTarget?.name ?? ''}
          onClose={() => setRevokeTarget(null)}
          onConfirm={() => {
            void handleRevoke();
          }}
        />
      ) : null}
    </SettingsSection>
  );
}
