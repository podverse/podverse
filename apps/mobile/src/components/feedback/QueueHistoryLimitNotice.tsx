import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { QueueHistoryLimitNotice as QueueHistoryLimitNoticeBody } from '@podverse/helpers';

import { requestWithMobileAuthRefresh, useAuth } from '../../auth';
import { getMobileConfig } from '../../config';
import { ConfirmDialog } from './ConfirmDialog';

function responseStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }
  const response = Reflect.get(error, 'response');
  if (typeof response !== 'object' || response === null) {
    return undefined;
  }
  const status = Reflect.get(response, 'status');
  return typeof status === 'number' ? status : undefined;
}

export function QueueHistoryLimitNotice() {
  const { t } = useTranslation();
  const auth = useAuth();
  const authRef = useRef(auth);
  authRef.current = auth;
  const accountId =
    auth.status === 'authenticated' && auth.account !== null ? auth.account.id : null;
  const [notice, setNotice] = useState<QueueHistoryLimitNoticeBody | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    if (accountId === null) {
      setNotice(null);
      setDismissed(false);
      setSaveFailed(false);
      return;
    }
    let cancelled = false;
    setNotice(null);
    setDismissed(false);
    setSaveFailed(false);
    const current = authRef.current;
    void requestWithMobileAuthRefresh(
      {
        accessToken: current.accessToken,
        clearSession: current.clearSession,
        refreshToken: current.refreshToken,
        setTokens: current.setTokens,
      },
      (api) => api.reqAccountQueueHistoryLimitNoticeGet()
    )
      .then((body) => {
        if (!cancelled) {
          setNotice(body);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNotice(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  const acknowledge = () => {
    if (notice === null || savingRef.current) {
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setSaveFailed(false);
    const current = authRef.current;
    void requestWithMobileAuthRefresh(
      {
        accessToken: current.accessToken,
        clearSession: current.clearSession,
        refreshToken: current.refreshToken,
        setTokens: current.setTokens,
      },
      (api) => api.reqAccountQueueHistoryLimitNoticeAcknowledge({ limit: notice.limit })
    )
      .then(() => {
        setDismissed(true);
      })
      .catch(async (error: unknown) => {
        if (responseStatus(error) !== 409) {
          setSaveFailed(true);
          return;
        }
        try {
          const latest = authRef.current;
          const next = await requestWithMobileAuthRefresh(
            {
              accessToken: latest.accessToken,
              clearSession: latest.clearSession,
              refreshToken: latest.refreshToken,
              setTokens: latest.setTokens,
            },
            (api) => api.reqAccountQueueHistoryLimitNoticeGet()
          );
          setNotice(next);
          if (!next.show) {
            setDismissed(true);
          }
        } catch {
          setSaveFailed(true);
        }
      })
      .finally(() => {
        savingRef.current = false;
        setSaving(false);
      });
  };

  if (notice === null || !notice.show || dismissed) {
    return null;
  }

  const contactEmail = getMobileConfig().contactEmail;
  const message = notice.at_limit
    ? t('membership.queue_history_limit_notice.at_limit', {
        contactEmail,
        limit: notice.limit,
      })
    : t('membership.queue_history_limit_notice.within', {
        contactEmail,
        limit: notice.limit,
      });

  return (
    <ConfirmDialog
      body={message}
      cancelLabel=""
      cancelTestID="queue-history-limit-notice-cancel"
      confirmLabel={t('membership.queue_history_limit_notice.understand')}
      confirmLoading={saving}
      confirmOnly
      confirmTestID="queue-history-limit-notice-understand"
      error={saveFailed ? t('membership.queue_history_limit_notice.save_failed') : undefined}
      testID="queue-history-limit-notice"
      title={t('membership.queue_history_limit_notice.title')}
      visible
      onCancel={() => undefined}
      onConfirm={acknowledge}
    />
  );
}
