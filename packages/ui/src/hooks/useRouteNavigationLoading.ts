'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  isInternalNavigationAnchor,
  wouldChangeAppRoute,
} from '../lib/navigation/isInternalNavigationAnchor';

/**
 * Tracks in-app route transitions after the first client render (link clicks, history, back/forward).
 * Pair with {@link NavigationLoadingOverlay} for a global navigation spinner.
 */
export function useRouteNavigationLoading(): boolean {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;

  const [isNavigating, setIsNavigating] = useState(false);
  const hasCompletedInitialLoadRef = useRef(false);
  // The settled pathname + search (hash excluded). Used to distinguish real
  // history navigation from in-page scroll-to-id (hash-only) changes.
  const settledRouteRef = useRef<string>('');

  const startNavigating = useCallback(() => {
    if (!hasCompletedInitialLoadRef.current) {
      return;
    }
    setIsNavigating(true);
  }, []);

  useEffect(() => {
    hasCompletedInitialLoadRef.current = true;
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      settledRouteRef.current = `${window.location.pathname}${window.location.search}`;
    }
    setIsNavigating(false);
  }, [routeKey]);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest('a');
      if (anchor === null || !isInternalNavigationAnchor(anchor, event)) {
        return;
      }

      const href = anchor.getAttribute('href');
      if (href === null || !wouldChangeAppRoute(href)) {
        return;
      }

      startNavigating();
    };

    const handlePopState = () => {
      // Ignore history changes that only move the hash (e.g. clicking a
      // table-of-contents link that scrolls to an id); those are not real
      // navigations and must not show the loading overlay.
      const nextRoute = `${window.location.pathname}${window.location.search}`;
      if (nextRoute === settledRouteRef.current) {
        return;
      }
      startNavigating();
    };

    const startIfHistoryUrlChangesRoute = (url: string | URL | null | undefined) => {
      if (url === null || url === undefined) {
        return;
      }
      const href = typeof url === 'string' ? url : url.toString();
      if (!wouldChangeAppRoute(href)) {
        return;
      }
      startNavigating();
    };

    const originalPushState = history.pushState.bind(history);
    const originalReplaceState = history.replaceState.bind(history);

    history.pushState = (...args) => {
      startIfHistoryUrlChangesRoute(args[2]);
      return originalPushState(...args);
    };
    history.replaceState = (...args) => {
      startIfHistoryUrlChangesRoute(args[2]);
      return originalReplaceState(...args);
    };

    document.addEventListener('click', handleDocumentClick, true);
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.removeEventListener('click', handleDocumentClick, true);
      window.removeEventListener('popstate', handlePopState);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, [startNavigating]);

  return isNavigating;
}
