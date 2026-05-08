'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import { Button, Modal, MODAL_CONTENT_MAX_WIDTH } from '@podverse/ui';

import { useModals } from '../../contexts/Modals';

import styles from '../../styles/components/Modal/ModalBoostMintRateLimit.module.scss';

export const ModalBoostMintRateLimit: React.FC = () => {
  const tValue = useTranslations('value');
  const tMisc = useTranslations('misc');
  const { modalBoostMintRateLimit, setModalBoostMintRateLimit } = useModals();

  if (!modalBoostMintRateLimit.message) {
    return null;
  }

  const clearModal = () => {
    setModalBoostMintRateLimit({ message: null });
  };

  const header = tValue('boost_messages.mint_rate_limit_modal_title');

  return (
    <Modal
      isOpen
      onClose={clearModal}
      closeButtonAriaLabel={tMisc('close_modal')}
      header={header}
      ariaLabel={header}
      modalContentMaxWidth={MODAL_CONTENT_MAX_WIDTH}
    >
      <p>{modalBoostMintRateLimit.message}</p>
      <div className={styles.actions}>
        <Button onClick={clearModal}>{tMisc('close')}</Button>
      </div>
    </Modal>
  );
};
