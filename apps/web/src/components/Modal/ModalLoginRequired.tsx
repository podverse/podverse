'use client';

import { useTranslations } from 'next-intl';
import React from 'react';
import { Modal, MODAL_CONTENT_MAX_WIDTH } from './Modal';
import { useModals } from '../../contexts/Modals';
import { CallToActionMessage } from '../CallToActionMessage/CallToActionMessage';

export const ModalLoginRequired: React.FC = () => {
  const tInstructions = useTranslations('instructions');
  const tAuthentication = useTranslations('authentication');
  const header = tInstructions('login_required');
  const { modalLoginRequired, setModalLoginRequired, setModalAuthLogin } = useModals();

  const clearModalLoginRequired = () => {
    setModalLoginRequired({
      title: null,
      message: null,
    });
  };

  const showLoginOnClick = () => {
    clearModalLoginRequired();
    setModalAuthLogin({ isOpen: true });
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
        buttonLabel={tAuthentication('login')}
        onButtonClick={showLoginOnClick}
      />
    </Modal>
  );
};
