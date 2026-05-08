'use client';

import classNames from 'classnames';
import type { CSSProperties, ReactNode } from 'react';
import { FaTimes } from 'react-icons/fa';

import styles from './Modal.module.scss';

export const MODAL_CONTENT_MAX_WIDTH = 580;

type ModalSharedProps = {
  ariaLabel: string;
  children: ReactNode;
  contentTransparent?: boolean;
  header?: string;
  isOpen: boolean;
  modalContentMaxWidth?: number;
};

export type ModalPropsWithDismiss = ModalSharedProps & {
  closeButtonAriaLabel: string;
  onClose: () => void;
};

export type ModalPropsWithoutDismiss = ModalSharedProps & {
  closeButtonAriaLabel?: undefined;
  onClose?: undefined;
};

export type ModalProps = ModalPropsWithDismiss | ModalPropsWithoutDismiss;

function isDismissible(props: ModalProps): props is ModalPropsWithDismiss {
  if (!('onClose' in props)) {
    return false;
  }
  const { onClose } = props;
  return typeof onClose === 'function';
}

export function Modal(props: ModalProps) {
  const { ariaLabel, children, contentTransparent, header, isOpen, modalContentMaxWidth } = props;

  if (!isOpen) {
    return null;
  }

  const dismiss = isDismissible(props);
  const onClose = dismiss ? props.onClose : undefined;
  const closeButtonAriaLabel = dismiss ? props.closeButtonAriaLabel : undefined;

  const modalContentStyle: CSSProperties = {
    ...(modalContentMaxWidth !== undefined ? { maxWidth: modalContentMaxWidth } : {}),
    ...(contentTransparent
      ? {
          background: 'transparent',
          height: '100%',
          minHeight: '100%',
          justifyContent: 'center',
        }
      : {}),
  };

  const modalChildrenStyle: CSSProperties = {
    ...(contentTransparent ? { marginTop: 0 } : {}),
  };

  const showHeaderRow = header !== undefined && (header || header === '');
  const showAbsoluteClose = !header && dismiss;

  return (
    <div
      aria-label={ariaLabel}
      aria-modal="true"
      className={styles.modalRoot}
      role="dialog"
      tabIndex={-1}
    >
      <div aria-hidden="true" className={styles.modalBackdrop} onClick={onClose} />
      <div className={styles.modalContent} style={modalContentStyle}>
        {showHeaderRow ? (
          <div className={styles.modalHeader}>
            <span className={styles.modalHeaderText} title={header}>
              {header}
            </span>
            {dismiss ? (
              <button
                aria-label={closeButtonAriaLabel}
                className={styles.modalCloseButton}
                onClick={onClose}
                type="button"
              >
                <FaTimes />
              </button>
            ) : null}
          </div>
        ) : null}
        {showAbsoluteClose ? (
          <button
            aria-label={closeButtonAriaLabel}
            className={classNames(styles.modalCloseButton, styles.modalCloseButtonAbsolute)}
            onClick={onClose}
            type="button"
          >
            <FaTimes />
          </button>
        ) : null}
        <div className={styles.modalChildren} style={modalChildrenStyle}>
          {children}
        </div>
      </div>
    </div>
  );
}
