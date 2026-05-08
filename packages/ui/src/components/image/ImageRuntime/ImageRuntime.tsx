'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useMemo } from 'react';

export type ImageRuntimeValue = {
  imageProxyEnabled: boolean;
  /** When false, shared `Image` uses Next.js `unoptimized` (no `/_next/image`). */
  nextImageOptimizationEnabled: boolean;
  proxyPathPrefix: string;
  placeholderSrc: string;
  /** Width/height used for fluid list-grid artwork slots (placeholder layout). */
  listGridSlotSize: number;
};

const ImageRuntimeContext = createContext<ImageRuntimeValue | null>(null);

export type ImageRuntimeProviderProps = ImageRuntimeValue & {
  children: ReactNode;
};

export function ImageRuntimeProvider({
  children,
  imageProxyEnabled,
  nextImageOptimizationEnabled,
  proxyPathPrefix,
  placeholderSrc,
  listGridSlotSize,
}: ImageRuntimeProviderProps) {
  const value = useMemo(
    () => ({
      imageProxyEnabled,
      nextImageOptimizationEnabled,
      proxyPathPrefix,
      placeholderSrc,
      listGridSlotSize,
    }),
    [
      imageProxyEnabled,
      listGridSlotSize,
      nextImageOptimizationEnabled,
      placeholderSrc,
      proxyPathPrefix,
    ]
  );

  return <ImageRuntimeContext.Provider value={value}>{children}</ImageRuntimeContext.Provider>;
}

export function useImageRuntime(): ImageRuntimeValue {
  const ctx = useContext(ImageRuntimeContext);
  if (ctx === null) {
    throw new Error('useImageRuntime must be used within ImageRuntimeProvider');
  }
  return ctx;
}
