'use client';

import React, { useEffect, useState } from 'react';

import type { CustomToastProps, ToastOptions } from '@podverse/ui/toast';

export type { CustomToastProps, ToastLinkComponentProps, ToastOptions } from '@podverse/ui/toast';

let implPromise: Promise<typeof import('@podverse/ui/toast')> | null = null;

function getImpl(): Promise<typeof import('@podverse/ui/toast')> {
  if (!implPromise) {
    implPromise = import('@podverse/ui/toast');
  }
  return implPromise;
}

export function showToast(message: string, type: 'success' | 'error' | 'warning' | 'danger'): void {
  getImpl().then((m) => m.showToast(message, type));
}

export function showToastCustom(
  props: CustomToastProps,
  type: 'warning' | 'danger',
  options?: ToastOptions
): Promise<string> {
  return getImpl().then((m) => m.showToastCustom(props, type, options));
}

export function showToastPromiseWithLoading<T>(
  promise: Promise<T> | (() => Promise<T>),
  msgs: { loading: string; success: string; error: string },
  options?: ToastOptions
): Promise<T> {
  return getImpl().then(async (m) => await m.showToastPromiseWithLoading(promise, msgs, options));
}

export function showToastPromise<T>(
  promise: Promise<T> | (() => Promise<T>),
  msgs: { success: string; error: string },
  options?: ToastOptions
): Promise<T> {
  return getImpl().then(async (m) => await m.showToastPromise(promise, msgs, options));
}

export function showToastLoading(message: string, options?: ToastOptions): Promise<string> {
  return getImpl().then((m) => m.showToastLoading(message, options));
}

export function dismissToast(toastId: string | Promise<string>): void {
  getImpl().then(async (m) => {
    const id = await Promise.resolve(toastId);
    m.dismissToast(id);
  });
}

/**
 * Lazy-loaded Toaster. Renders the real Toaster after dynamic import of `@podverse/ui/toast`
 * so react-hot-toast stays out of the main bundle.
 */
export function Toast(): React.ReactElement | null {
  const [ToastImplComponent, setToastImplComponent] = useState<React.FC | null>(null);

  useEffect(() => {
    getImpl().then((m) => setToastImplComponent(() => m.Toast));
  }, []);

  return ToastImplComponent ? <ToastImplComponent /> : null;
}
