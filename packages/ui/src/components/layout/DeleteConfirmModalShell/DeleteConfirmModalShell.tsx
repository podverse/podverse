'use client';

import type { ReactNode } from 'react';

import { Button } from '../../button/Button/Button';
import { Modal, ModalActions } from '../Modal/Modal';

export type DeleteConfirmModalShellProps = {
  cancelLabel: string;
  closeButtonAriaLabel: string;
  confirmLabel: string;
  isOpen: boolean;
  isPending: boolean;
  message: ReactNode;
  modalAriaLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * Presentational delete confirmation using shared `Modal` + `Modal.Actions` + `Button`.
 * Apps pass localized strings (see shared-ui-i18n).
 */
export function DeleteConfirmModalShell({
  cancelLabel,
  closeButtonAriaLabel,
  confirmLabel,
  isOpen,
  isPending,
  message,
  modalAriaLabel,
  onCancel,
  onConfirm,
}: DeleteConfirmModalShellProps) {
  return (
    <Modal
      ariaLabel={modalAriaLabel}
      closeButtonAriaLabel={closeButtonAriaLabel}
      isOpen={isOpen}
      onClose={onCancel}
    >
      <div>{message}</div>
      <ModalActions>
        <Button disabled={isPending} onClick={onCancel} type="button" variant="secondary">
          {cancelLabel}
        </Button>
        <Button
          isLoading={isPending}
          onClick={() => void onConfirm()}
          type="button"
          variant="primary"
        >
          {confirmLabel}
        </Button>
      </ModalActions>
    </Modal>
  );
}
