'use client';

import { useTranslations } from 'next-intl';
import React from 'react';
import { Modal, MODAL_CONTENT_MAX_WIDTH } from './Modal';
import { BoostForm } from '../Boost/BoostForm';
import { useModals } from '../../contexts/Modals';

export const ModalBoost: React.FC = () => {
  const { modalBoost, setModalBoost } = useModals();
  const tValue = useTranslations('value');
  const header = tValue('boost');

  if (!modalBoost.channel) {
    return null;
  }
  const isOpen = !!modalBoost.channel;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => setModalBoost({ channel: null, item: null })}
      header={header}
      ariaLabel={header}
      modalContentMaxWidth={MODAL_CONTENT_MAX_WIDTH}
    >
      <BoostForm channel={modalBoost.channel} item={modalBoost.item} />
    </Modal>
  );
};
