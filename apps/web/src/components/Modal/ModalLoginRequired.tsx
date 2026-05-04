'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React from 'react';

import { useModals } from '../../contexts/Modals';
import { CallToActionMessage } from '../CallToActionMessage/CallToActionMessage';
import { Modal, MODAL_CONTENT_MAX_WIDTH } from './Modal';

export const ModalLoginRequired: React.FC = () => {
  const tInstructions = useTranslations('instructions');
  const tAuthentication = useTranslations('authentication');
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
      header={header}
      ariaLabel={header}
      modalContentMaxWidth={MODAL_CONTENT_MAX_WIDTH}
    >
      <CallToActionMessage
        message={modalLoginRequired.message || ''}
        buttonLabel={modalLoginRequired.actionLabel ?? tAuthentication('login')}
        onButtonClick={modalLoginRequired.actionHref ? handleActionOnClick : showLoginOnClick}
      />
    </Modal>
  );
};
