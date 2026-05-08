'use client';

import { useTranslations } from 'next-intl';
import React, { useRef, useState } from 'react';

import { copyToClipboard } from '@podverse/helpers-browser';
import { Modal, TextInput } from '@podverse/ui';

import { WEB } from '../../constants/web';
import { useModals } from '../../contexts/Modals';

export const ModalClipCreated: React.FC = () => {
  const tFeatures = useTranslations('features');
  const tMisc = useTranslations('misc');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { modalClipCreated, setModalClipCreated } = useModals();

  const header = tFeatures('clip.clip_created');

  if (!modalClipCreated.clip) {
    return null;
  }

  const clipUrl = `${WEB.origin}/clip/${modalClipCreated.clip.id_text}`;

  const clearModalClipCreated = () => {
    setModalClipCreated({
      clip: null,
    });
  };

  const handleCopy = (value: string) => {
    copyToClipboard(value);
    setIsCopied(true);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };

  return (
    <Modal
      isOpen={!!modalClipCreated.clip}
      onClose={clearModalClipCreated}
      closeButtonAriaLabel={tMisc('close_modal')}
      header={header}
      ariaLabel={header}
    >
      <TextInput
        key="clip_url"
        type="text"
        name="clip_url"
        value={clipUrl}
        eyebrow={tFeatures('clip.link_to_clip')}
        button={{
          label: isCopied ? tFeatures('copied') : tFeatures('copy'),
          onClick: () => handleCopy(clipUrl),
        }}
        readOnly
      />
    </Modal>
  );
};
