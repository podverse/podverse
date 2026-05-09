'use client';

import classNames from 'classnames';
import type { CSSProperties, ReactNode } from 'react';
import { FaTimes } from 'react-icons/fa';

import styles from './Modal.module.scss';

export const MODAL_CONTENT_MAX_WIDTH = 580;

type ModalContentInlineStyle = CSSProperties & {
  '--modal-content-max-width'?: string;
};

type ModalSharedProps = {
  ariaLabel: string;
  children: ReactNode;
  /** When true, scrollbars are disabled on the scroll region (overflow hidden). Use for full-viewport layouts that shrink their own content (e.g. media player). */
  contentOverflowHidden?: boolean;
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

export type ModalBodyProps = {
  children: ReactNode;
  className?: string;
};

export function ModalBody({ children, className }: ModalBodyProps) {
  return <div className={classNames(styles.modalBody, className)}>{children}</div>;
}

export type ModalActionsProps = {
  children: ReactNode;
  className?: string;
};

export function ModalActions({ children, className }: ModalActionsProps) {
  return <div className={classNames(styles.modalActions, className)}>{children}</div>;
}

function isDismissible(props: ModalProps): props is ModalPropsWithDismiss {
  if (!('onClose' in props)) {
    return false;
  }
  const { onClose } = props;
  return typeof onClose === 'function';
}

function ModalImpl(props: ModalProps) {
  const {
    ariaLabel,
    children,
    contentOverflowHidden,
    contentTransparent,
    header,
    isOpen,
    modalContentMaxWidth,
  } = props;

  if (!isOpen) {
    return null;
  }

  const dismiss = isDismissible(props);
  const onClose = dismiss ? props.onClose : undefined;
  const closeButtonAriaLabel = dismiss ? props.closeButtonAriaLabel : undefined;

  const resolvedMaxWidth = modalContentMaxWidth ?? MODAL_CONTENT_MAX_WIDTH;
  const modalContentStyle: ModalContentInlineStyle = {
    '--modal-content-max-width': `${resolvedMaxWidth}px`,
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
      <div
        className={classNames(
          styles.modalContent,
          contentTransparent ? styles.modalContentTransparent : undefined
        )}
        style={modalContentStyle}
      >
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
        <div
          className={classNames(
            styles.modalChildren,
            contentTransparent ? styles.modalChildrenTransparent : undefined,
            contentOverflowHidden ? styles.modalChildrenOverflowHidden : undefined
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export const Modal = Object.assign(ModalImpl, {
  Actions: ModalActions,
  Body: ModalBody,
});
