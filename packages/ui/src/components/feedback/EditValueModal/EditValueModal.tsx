'use client';

import { useEffect, useState } from 'react';

import { Button } from '../../button/Button/Button';
import { TextInput } from '../../form/TextInput/TextInput';
import { Modal, ModalActions, ModalBody } from '../../layout/Modal/Modal';

import styles from './EditValueModal.module.scss';

export type EditValueModalProps = {
  cancelLabel: string;
  closeButtonAriaLabel: string;
  emptyValueMessage: string;
  externalError?: string | null;
  initialValue: string;
  inputAriaLabel: string;
  inputEyebrow: string;
  inputId: string;
  isOpen: boolean;
  isSaving?: boolean;
  max?: number;
  min?: number;
  modalAriaLabel: string;
  numberStepperAriaLabels?: { decrement: string; increment: string };
  onClose: () => void;
  onSubmit: (raw: string) => void | Promise<void>;
  saveLabel: string;
  step?: number;
  title: string;
  type?: 'text' | 'number';
};

export function EditValueModal({
  cancelLabel,
  closeButtonAriaLabel,
  emptyValueMessage,
  externalError = null,
  initialValue,
  inputAriaLabel,
  inputEyebrow,
  inputId,
  isOpen,
  isSaving = false,
  max,
  min,
  modalAriaLabel,
  numberStepperAriaLabels,
  onClose,
  onSubmit,
  saveLabel,
  step,
  title,
  type = 'text',
}: EditValueModalProps) {
  const [value, setValue] = useState(initialValue);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
      setLocalError(null);
    }
  }, [isOpen, initialValue]);

  const combinedError = localError !== null ? localError : externalError;
  const showError = combinedError !== null && combinedError !== '';

  const handleSubmit = async () => {
    const trimmed = value.trim();
    if (trimmed === '') {
      setLocalError(emptyValueMessage);
      return;
    }
    setLocalError(null);
    await onSubmit(trimmed);
  };

  return (
    <Modal
      ariaLabel={modalAriaLabel}
      closeButtonAriaLabel={closeButtonAriaLabel}
      header={title}
      isOpen={isOpen}
      onClose={onClose}
    >
      <ModalBody>
        <TextInput
          aria-invalid={showError}
          aria-label={inputAriaLabel}
          eyebrow={inputEyebrow}
          id={inputId}
          max={max}
          min={min}
          numberStepperAriaLabels={numberStepperAriaLabels}
          step={step}
          type={type}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setLocalError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              void handleSubmit();
            }
          }}
        />
        {showError ? (
          <p className={styles.error} role="alert">
            {combinedError}
          </p>
        ) : null}
      </ModalBody>
      <ModalActions>
        <Button disabled={isSaving} type="button" variant="secondary" onClick={onClose}>
          {cancelLabel}
        </Button>
        <Button
          isLoading={isSaving}
          type="button"
          variant="primary"
          onClick={() => void handleSubmit()}
        >
          {saveLabel}
        </Button>
      </ModalActions>
    </Modal>
  );
}
