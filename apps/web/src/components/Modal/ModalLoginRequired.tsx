'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React from 'react';

import { CallToActionMessage, Modal } from '@podverse/ui';

import { useModals } from '../../contexts/Modals';

export const ModalLoginRequired: React.FC = () => {
  const tInstructions = useTranslations('instructions');
  const tAuthentication = useTranslations('authentication');
  const tMisc = useTranslations('misc');
  const header = tInstructions('login_required');
  const { modalLoginRequired, setModalLoginRequired, setModalAuthLogin } = useModals();
  const router = useRouter();

  const clearModalLoginRequired = () => {
    setModalLoginRequired({
      title: null,
      message: null,
      actionLabel: null,
      actionHref: null,
    });
  };

  const showLoginOnClick = () => {
    clearModalLoginRequired();
    setModalAuthLogin({ isOpen: true });
  };

  const handleActionOnClick = () => {
    const actionHref = modalLoginRequired.actionHref;
    clearModalLoginRequired();
    if (actionHref) {
      router.push(actionHref);
    }
  };

  return (
    <Modal
      isOpen={!!modalLoginRequired.message}
      onClose={clearModalLoginRequired}
      closeButtonAriaLabel={tMisc('close_modal')}
      header={header}
      ariaLabel={header}
    >
      <CallToActionMessage
        message={modalLoginRequired.message || ''}
        buttonLabel={modalLoginRequired.actionLabel ?? tAuthentication('login')}
        onButtonClick={modalLoginRequired.actionHref ? handleActionOnClick : showLoginOnClick}
      />
    </Modal>
  );
};
