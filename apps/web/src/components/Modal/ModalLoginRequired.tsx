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
  const { modalLoginRequired, setModalLoginRequired, setModalAuthLogin } = useModals();
  const header = modalLoginRequired.title ?? tInstructions('login_required');
  const router = useRouter();

  const clearModalLoginRequired = () => {
    setModalLoginRequired({
      title: null,
      message: null,
      messageNode: null,
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

  const messageBody =
    modalLoginRequired.messageNode !== null && modalLoginRequired.messageNode !== undefined
      ? modalLoginRequired.messageNode
      : (modalLoginRequired.message ?? '');

  return (
    <Modal
      isOpen={
        (modalLoginRequired.message !== null && modalLoginRequired.message !== '') ||
        (modalLoginRequired.messageNode !== null && modalLoginRequired.messageNode !== undefined)
      }
      onClose={clearModalLoginRequired}
      closeButtonAriaLabel={tMisc('close_modal')}
      header={header}
      ariaLabel={header}
    >
      <CallToActionMessage
        message={messageBody}
        buttonLabel={modalLoginRequired.actionLabel ?? tAuthentication('login')}
        onButtonClick={modalLoginRequired.actionHref ? handleActionOnClick : showLoginOnClick}
      />
    </Modal>
  );
};
