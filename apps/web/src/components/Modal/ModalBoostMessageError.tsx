'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import { Button, Modal, ModalActions } from '@podverse/ui';

import { useModals } from '../../contexts/Modals';

export const ModalBoostMessageError: React.FC = () => {
  const tValue = useTranslations('value');
  const tMisc = useTranslations('misc');
  const { modalBoostMessageError, setModalBoostMessageError } = useModals();

  if (!modalBoostMessageError.message) {
    return null;
  }

  const clearModal = () => {
    setModalBoostMessageError({
      title: null,
      message: null,
      primaryActionI18nKey: null,
      onSendAnyway: null,
      onCancel: null,
    });
  };

  const handleSendAnyway = () => {
    const handler = modalBoostMessageError.onSendAnyway ?? null;
    clearModal();
    if (handler) {
      handler();
    }
  };

  const handleCancel = () => {
    const handler = modalBoostMessageError.onCancel ?? null;
    clearModal();
    if (handler) {
      handler();
    }
  };

  const header = modalBoostMessageError.title ?? tValue('boost_messages.server_error_title');

  return (
    <Modal
      isOpen={!!modalBoostMessageError.message}
      onClose={handleCancel}
      closeButtonAriaLabel={tMisc('close_modal')}
      header={header}
      ariaLabel={header}
    >
      <p>{modalBoostMessageError.message}</p>
      <ModalActions>
        <Button variant="secondary" onClick={handleCancel}>
          {tMisc('cancel')}
        </Button>
        <Button onClick={handleSendAnyway}>
          {tValue(modalBoostMessageError.primaryActionI18nKey ?? 'boost_messages.pay_anyway')}
        </Button>
      </ModalActions>
    </Modal>
  );
};
