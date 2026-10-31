'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import type { AuthSessionEndedNotice } from '@podverse/helpers';
import { Button, Modal } from '@podverse/ui';

import { useAccount } from '../../contexts/Account';
import {
  releaseSessionEndedNoticeHold,
  sessionEndedNoticeMessageKey,
  setSessionEndedHandler,
  storePendingSessionEndedNotice,
  takePendingSessionEndedNotice,
} from '../../lib/auth/sessionEndedNotice';
import { signOutThisBrowser } from '../../lib/auth/signOutThisBrowser';

export function SessionEndedNotice() {
  const tAuthentication = useTranslations('authentication');
  const tMisc = useTranslations('misc');
  const { loggedInAccount } = useAccount();
  const accountIdText = loggedInAccount?.id_text ?? null;
  const [notice, setNotice] = useState<AuthSessionEndedNotice | null>(null);

  useEffect(() => {
    setNotice(takePendingSessionEndedNotice());
  }, []);

  useEffect(() => {
    setSessionEndedHandler(async (endedNotice) => {
      storePendingSessionEndedNotice(endedNotice);
      await signOutThisBrowser(accountIdText);
    });
    return () => {
      setSessionEndedHandler(null);
    };
  }, [accountIdText]);

  if (notice === null) {
    return null;
  }

  const close = () => {
    releaseSessionEndedNoticeHold();
    setNotice(null);
  };
  const title = tAuthentication('session_ended.title');

  return (
    <Modal
      isOpen
      onClose={close}
      header={title}
      ariaLabel={title}
      closeButtonAriaLabel={tMisc('close_modal')}
    >
      <Modal.Body>
        <p>{tAuthentication(sessionEndedNoticeMessageKey(notice))}</p>
        <Modal.Actions>
          <Button type="button" variant="primary" onClick={close}>
            {tMisc('close')}
          </Button>
        </Modal.Actions>
      </Modal.Body>
    </Modal>
  );
}
