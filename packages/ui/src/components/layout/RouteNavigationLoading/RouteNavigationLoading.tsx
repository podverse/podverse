'use client';

import { useRouteNavigationLoading } from '../../../hooks/useRouteNavigationLoading';
import { NavigationLoadingOverlay } from '../NavigationLoadingOverlay/NavigationLoadingOverlay';

export type RouteNavigationLoadingProps = {
  ariaLabel: string;
};

/**
 * Global in-app route transition overlay. Mount once near the app root; pass localized `ariaLabel`.
 */
export function RouteNavigationLoading({ ariaLabel }: RouteNavigationLoadingProps) {
  const isNavigating = useRouteNavigationLoading();

  return <NavigationLoadingOverlay ariaLabel={ariaLabel} isLoading={isNavigating} />;
}
