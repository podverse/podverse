'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import { Modal, MODAL_CONTENT_MAX_WIDTH } from '@podverse/ui';

import { useModals } from '../../contexts/Modals';
import { BoostForm } from '../Boost/BoostForm';

export const ModalBoost: React.FC = () => {
  const { modalBoost, setModalBoost } = useModals();
  const tValue = useTranslations('value');
  const tMisc = useTranslations('misc');
  const header = tValue('boost');

  if (!modalBoost.channel) {
    return null;
  }
  const isOpen = !!modalBoost.channel;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => setModalBoost({ channel: null, item: null })}
      closeButtonAriaLabel={tMisc('close_modal')}
      header={header}
      ariaLabel={header}
      modalContentMaxWidth={MODAL_CONTENT_MAX_WIDTH}
    >
      <BoostForm channel={modalBoost.channel} item={modalBoost.item} />
    </Modal>
  );
};
