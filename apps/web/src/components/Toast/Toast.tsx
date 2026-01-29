'use client';

import React, { useEffect, useState } from 'react';

export type { CustomToastProps, ToastOptions } from './ToastImpl';

let implPromise: Promise<typeof import('./ToastImpl')> | null = null;

function getImpl(): Promise<typeof import('./ToastImpl')> {
  if (!implPromise) {
    implPromise = import('./ToastImpl');
  }
  return implPromise;
}

export function showToast(message: string, type: 'success' | 'error' | 'warning' | 'danger'): void {
  getImpl().then((m) => m.showToast(message, type));
}

export function showToastCustom(
  props: import('./ToastImpl').CustomToastProps,
  type: 'warning' | 'danger',
  options?: import('./ToastImpl').ToastOptions
): Promise<string> {
  return getImpl().then((m) => m.showToastCustom(props, type, options));
}

export function showToastPromiseWithLoading<T>(
  promise: Promise<T> | (() => Promise<T>),
  msgs: { loading: string; success: string; error: string },
  options?: import('./ToastImpl').ToastOptions
): Promise<T> {
  return getImpl().then(async (m) => await m.showToastPromiseWithLoading(promise, msgs, options));
}

export function showToastPromise<T>(
  promise: Promise<T> | (() => Promise<T>),
  msgs: { success: string; error: string },
  options?: import('./ToastImpl').ToastOptions
): Promise<T> {
  return getImpl().then(async (m) => await m.showToastPromise(promise, msgs, options));
}

export function showToastLoading(
  message: string,
  options?: import('./ToastImpl').ToastOptions
): Promise<string> {
  return getImpl().then((m) => m.showToastLoading(message, options));
}

export function dismissToast(toastId: string | Promise<string>): void {
  getImpl().then(async (m) => {
    const id = await Promise.resolve(toastId);
    m.dismissToast(id);
  });
}

/**
 * Lazy-loaded Toaster. Renders the real Toaster from ToastImpl after dynamic import.
 * Keeps react-hot-toast out of the main bundle.
 */
export function Toast(): React.ReactElement | null {
  const [ToastImplComponent, setToastImplComponent] = useState<React.FC | null>(null);

  useEffect(() => {
    getImpl().then((m) => setToastImplComponent(() => m.Toast));
  }, []);

  return ToastImplComponent ? <ToastImplComponent /> : null;
}
