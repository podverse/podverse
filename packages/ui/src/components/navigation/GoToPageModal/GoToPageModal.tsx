'use client';

import { useEffect, useState } from 'react';

import { Button } from '../../button/Button/Button';
import { TextInput } from '../../form/TextInput/TextInput';
import { Modal, ModalActions } from '../../layout/Modal/Modal';

export type GoToPageModalProps = {
  cancelLabel: string;
  closeButtonAriaLabel: string;
  invalidPageMessage: string;
  isOpen: boolean;
  modalAriaLabel: string;
  onClose: () => void;
  onSubmit: (page: number) => void;
  pageInputLabel: string;
  submitLabel: string;
  title: string;
  totalPages: number;
};

export function GoToPageModal({
  cancelLabel,
  closeButtonAriaLabel,
  invalidPageMessage,
  isOpen,
  modalAriaLabel,
  onClose,
  onSubmit,
  pageInputLabel,
  submitLabel,
  title,
  totalPages,
}: GoToPageModalProps) {
  const [raw, setRaw] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setRaw('');
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = () => {
    const n = Number.parseInt(raw.trim(), 10);
    if (!Number.isFinite(n) || n < 1 || n > totalPages) {
      setError(invalidPageMessage);
      return;
    }
    setError(null);
    onSubmit(n);
    onClose();
  };

  return (
    <Modal
      ariaLabel={modalAriaLabel}
      closeButtonAriaLabel={closeButtonAriaLabel}
      header={title}
      isOpen={isOpen}
      onClose={onClose}
    >
      <TextInput
        aria-invalid={error !== null}
        aria-label={pageInputLabel}
        eyebrow={pageInputLabel}
        onChange={(e) => {
          setRaw(e.target.value);
          setError(null);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleSubmit();
          }
        }}
        type="text"
        value={raw}
      />
      {error !== null ? (
        <p role="alert" style={{ marginTop: 'var(--spacing-md)' }}>
          {error}
        </p>
      ) : null}
      <ModalActions>
        <Button onClick={onClose} type="button" variant="secondary">
          {cancelLabel}
        </Button>
        <Button onClick={() => handleSubmit()} type="button" variant="primary">
          {submitLabel}
        </Button>
      </ModalActions>
    </Modal>
  );
}
