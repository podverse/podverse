'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import type { ToastOptions, Toast as ToastType } from 'react-hot-toast';
import toast, { Toaster } from 'react-hot-toast';
import NextLink from 'next/link';
import { FaXmark } from 'react-icons/fa6';
import styles from '../../styles/components/Toast/Toast.module.scss';

const duration = 4000;

export function showToast(message: string, type: 'success' | 'error' | 'warning' | 'danger') {
  if (type === 'success') {
    toast.success(message, { duration, className: styles.toast });
  } else if (type === 'error') {
    toast.error(message, { duration, className: styles.toastDanger });
  }
}

export interface CustomToastProps {
  message: React.ReactNode;
  linkText: string;
  linkHref: string;
  onLinkClick?: () => void;
  onDismiss?: () => void;
}

type ToastCustomContentProps = CustomToastProps & {
  t: ToastType;
  toastClassName: string;
};

function ToastCustomContent({
  t,
  message,
  linkText,
  linkHref,
  onLinkClick,
  onDismiss,
  toastClassName,
}: ToastCustomContentProps) {
  const tMisc = useTranslations('misc');

  const handleDismiss = () => {
    toast.dismiss(t.id);
    onDismiss?.();
  };

  const handleLinkClick = (_e: React.MouseEvent<HTMLAnchorElement>) => {
    onLinkClick?.();
  };

  return (
    <div
      className={`${toastClassName} ${styles.toastCustomWrapper} ${t.visible ? styles.toastCustomWrapperVisible : styles.toastCustomWrapperHidden}`}
    >
      <div className={styles.toastContentColumn}>
        <div>{message}</div>
        <div>
          <NextLink href={linkHref} onClick={handleLinkClick} className={styles.toastLink}>
            {linkText}
          </NextLink>
        </div>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        className={styles.toastDismissButton}
        aria-label={tMisc('dismiss')}
      >
        <FaXmark />
      </button>
    </div>
  );
}

export function showToastCustom(
  props: CustomToastProps,
  type: 'warning' | 'danger',
  options?: ToastOptions
): string {
  const { message, linkText, linkHref, onLinkClick, onDismiss } = props;
  const toastClassName = (type === 'warning' ? styles.toastWarning : styles.toastDanger) ?? '';

  return toast.custom(
    (t: ToastType) => (
      <ToastCustomContent
        t={t}
        message={message}
        linkText={linkText}
        linkHref={linkHref}
        onLinkClick={onLinkClick}
        onDismiss={onDismiss}
        toastClassName={toastClassName}
      />
    ),
    {
      duration: Infinity,
      ...options,
    }
  );
}

export function showToastPromiseWithLoading<T>(
  promise: Promise<T> | (() => Promise<T>),
  msgs: {
    loading: string;
    success: string;
    error: string;
  },
  options?: ToastOptions
) {
  const p = typeof promise === 'function' ? promise() : promise;

  const toastId = toast.loading(msgs.loading, {
    ...options,
    className: styles.toast,
    duration: Infinity,
  });

  p.then(
    () => {
      toast.dismiss(toastId as string);
      toast.success(msgs.success, {
        ...options,
        className: styles.toast,
        duration,
      });
    },
    () => {
      toast.dismiss(toastId as string);
      toast.error(msgs.error, {
        ...options,
        className: styles.toast,
        duration,
      });
    }
  );
  return p;
}

export function showToastPromise<T>(
  promise: Promise<T> | (() => Promise<T>),
  msgs: {
    success: string;
    error: string;
  },
  options?: ToastOptions
) {
  const p = typeof promise === 'function' ? promise() : promise;

  p.then(
    () => {
      toast.success(msgs.success, {
        ...options,
        className: styles.toast,
        duration,
      });
    },
    () => {
      toast.error(msgs.error, {
        ...options,
        className: styles.toast,
        duration,
      });
    }
  );
  return p;
}

/**
 * Shows a loading toast that persists until manually dismissed.
 * Returns the toast ID for later dismissal.
 */
export function showToastLoading(message: string, options?: ToastOptions): string {
  return toast.loading(message, {
    ...options,
    className: styles.toast,
    duration: Infinity,
  });
}

/**
 * Dismisses a toast by its ID.
 */
export function dismissToast(toastId: string): void {
  toast.dismiss(toastId);
}

export const Toast: React.FC = () => (
  <Toaster
    position="top-right"
    reverseOrder={false}
    gutter={8}
    toastOptions={{
      duration,
      className: styles.toast,
    }}
  />
);

export type { ToastOptions };
