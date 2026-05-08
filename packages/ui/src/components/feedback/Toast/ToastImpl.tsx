'use client';

import type { ComponentType, MouseEvent, ReactElement, ReactNode } from 'react';
import type { Toast as ToastType, ToastOptions } from 'react-hot-toast';
import toast, { Toaster } from 'react-hot-toast';
import { FaXmark } from 'react-icons/fa6';

import { TOAST_DURATION_MS } from '@podverse/helpers';

import styles from './Toast.module.scss';

const duration = TOAST_DURATION_MS;

export type ToastLinkComponentProps = {
  href: string;
  className?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  children: ReactNode;
};

export function showToast(message: string, type: 'success' | 'error' | 'warning' | 'danger'): void {
  if (type === 'success') {
    toast.success(message, { duration: TOAST_DURATION_MS, className: styles.toast });
  } else if (type === 'error') {
    toast.error(message, { duration: TOAST_DURATION_MS, className: styles.toastDanger });
  } else if (type === 'warning') {
    toast(message, { duration: TOAST_DURATION_MS, className: styles.toastWarning });
  } else if (type === 'danger') {
    toast(message, { duration: TOAST_DURATION_MS, className: styles.toastDanger });
  }
}

export interface CustomToastProps {
  message: ReactNode;
  linkText: string;
  linkHref: string;
  onLinkClick?: () => void;
  onDismiss?: () => void;
  /** Localized label for the dismiss control (apps pass from i18n). */
  dismissButtonAriaLabel: string;
  /** Optional client router link (e.g. Next.js `Link`). Falls back to `<a href>`. */
  LinkComponent?: ComponentType<ToastLinkComponentProps>;
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
  dismissButtonAriaLabel,
  LinkComponent,
  toastClassName,
}: ToastCustomContentProps): ReactElement {
  const handleDismiss = () => {
    toast.dismiss(t.id);
    onDismiss?.();
  };

  const handleLinkClick = (_event: MouseEvent<HTMLAnchorElement>) => {
    onLinkClick?.();
  };

  const LinkTag: ComponentType<ToastLinkComponentProps> | 'a' = LinkComponent ?? 'a';

  return (
    <div
      className={`${toastClassName} ${styles.toastCustomWrapper} ${t.visible ? styles.toastCustomWrapperVisible : styles.toastCustomWrapperHidden}`}
    >
      <div className={styles.toastContentColumn}>
        <div>{message}</div>
        <div>
          <LinkTag href={linkHref} onClick={handleLinkClick} className={styles.toastLink}>
            {linkText}
          </LinkTag>
        </div>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        className={styles.toastDismissButton}
        aria-label={dismissButtonAriaLabel}
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
  const {
    message,
    linkText,
    linkHref,
    onLinkClick,
    onDismiss,
    dismissButtonAriaLabel,
    LinkComponent,
  } = props;
  const toastClassName =
    type === 'warning' ? (styles.toastWarning ?? '') : (styles.toastDanger ?? '');

  return toast.custom(
    (toastInstance: ToastType) => (
      <ToastCustomContent
        dismissButtonAriaLabel={dismissButtonAriaLabel}
        LinkComponent={LinkComponent}
        linkHref={linkHref}
        linkText={linkText}
        message={message}
        onDismiss={onDismiss}
        onLinkClick={onLinkClick}
        t={toastInstance}
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
): Promise<T> {
  const p = typeof promise === 'function' ? promise() : promise;

  const toastId = toast.loading(msgs.loading, {
    ...options,
    className: styles.toast,
    duration: Infinity,
  });

  p.then(
    () => {
      toast.dismiss(toastId);
      toast.success(msgs.success, {
        ...options,
        className: styles.toast,
        duration,
      });
    },
    () => {
      toast.dismiss(toastId);
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
): Promise<T> {
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

export function Toast(): ReactElement {
  return (
    <Toaster
      gutter={8}
      position="top-right"
      reverseOrder={false}
      toastOptions={{
        duration,
        className: styles.toast,
      }}
    />
  );
}

export type { ToastOptions };
