'use client';

import { useTranslations } from 'next-intl';

import { Button, Modal, ModalActions } from '@podverse/ui';

type ModalOpmlImportRateLimitProps = {
  isOpen: boolean;
  message: string | null;
  onClose: () => void;
};

export function ModalOpmlImportRateLimit({
  isOpen,
  message,
  onClose,
}: ModalOpmlImportRateLimitProps) {
  const tSettings = useTranslations('settings');
  const tMisc = useTranslations('misc');

  if (!isOpen || message === null || message === '') {
    return null;
  }

  const header = tSettings('opml.import_rate_limited_title');

  return (
    <Modal
      isOpen
      onClose={onClose}
      closeButtonAriaLabel={tMisc('close_modal')}
      header={header}
      ariaLabel={header}
    >
      <p>{message}</p>
      <ModalActions>
        <Button onClick={onClose}>{tMisc('close')}</Button>
      </ModalActions>
    </Modal>
  );
}
