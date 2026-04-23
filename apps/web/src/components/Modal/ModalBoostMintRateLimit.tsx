'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import { useModals } from '../../contexts/Modals';
import { Button } from '../Button/Button';
import { Modal, MODAL_CONTENT_MAX_WIDTH } from './Modal';

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
