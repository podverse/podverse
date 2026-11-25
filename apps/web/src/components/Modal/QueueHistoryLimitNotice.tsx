'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import type { QueueHistoryLimitNotice } from '@podverse/helpers';
import { Button, Modal } from '@podverse/ui';

import { getContactEmail } from '../../constants/contact';
import { useAccount } from '../../contexts/Account';
import { getApiRequestService } from '../../factories/apiRequestService';

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
  const t = useTranslations('membership');
  const { loggedInAccount } = useAccount();
  const accountId = loggedInAccount?.id ?? null;
  const [notice, setNotice] = useState<QueueHistoryLimitNotice | null>(null);
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
    void getApiRequestService()
      .reqAccountQueueHistoryLimitNoticeGet()
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

  const acknowledge = async () => {
    if (notice === null || savingRef.current) {
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setSaveFailed(false);
    try {
      await getApiRequestService().reqAccountQueueHistoryLimitNoticeAcknowledge({
        limit: notice.limit,
      });
      setDismissed(true);
    } catch (error) {
      if (responseStatus(error) === 409) {
        try {
          const next = await getApiRequestService().reqAccountQueueHistoryLimitNoticeGet();
          setNotice(next);
          if (!next.show) {
            setDismissed(true);
          }
        } catch {
          setSaveFailed(true);
        }
      } else {
        setSaveFailed(true);
      }
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  if (notice === null || !notice.show || dismissed) {
    return null;
  }

  const message = notice.at_limit
    ? t('queue_history_limit_notice.at_limit', {
        contactEmail: getContactEmail(),
        limit: notice.limit,
      })
    : t('queue_history_limit_notice.within', {
        contactEmail: getContactEmail(),
        limit: notice.limit,
      });
  const title = t('queue_history_limit_notice.title');

  return (
    <Modal isOpen ariaLabel={title} header={title}>
      <Modal.Body>
        <div>{message}</div>
        {saveFailed ? <div role="alert">{t('queue_history_limit_notice.save_failed')}</div> : null}
      </Modal.Body>
      <Modal.Actions>
        <Button autoFocus isLoading={saving} type="button" onClick={() => void acknowledge()}>
          {t('queue_history_limit_notice.understand')}
        </Button>
      </Modal.Actions>
    </Modal>
  );
}
