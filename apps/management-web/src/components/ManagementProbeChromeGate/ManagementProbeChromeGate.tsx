'use client';

import type { ReactNode } from 'react';

import { resolveManagementProbeChromePhase } from '../../lib/managementProbeChromeGate';
import { ManagementLoadingSpinnerOverlay } from '../LoadingSpinner/ManagementLoadingSpinnerOverlay';

export type ManagementProbeChromeGateProps = {
  bypassWhileError: boolean;
  children: ReactNode;
  loading: boolean;
  probingExistence: boolean;
};

/** Hides children until load + probe gate passes; shows full-main spinner instead. */
export function ManagementProbeChromeGate({
  bypassWhileError,
  children,
  loading,
  probingExistence,
}: ManagementProbeChromeGateProps) {
  const phase = resolveManagementProbeChromePhase({
    bypassWhileError,
    loading,
    probingExistence,
  });

  if (phase === 'spinner') {
    return <ManagementLoadingSpinnerOverlay isLoading />;
  }

  return <>{children}</>;
}
