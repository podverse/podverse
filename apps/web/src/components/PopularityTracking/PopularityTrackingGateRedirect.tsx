'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { ROUTES } from '../../constants/routes';
import { useAccount } from '../../contexts/Account';
import { useConfig } from '../../contexts/Config';
import { isPopularityTrackingPromptRequiredForAccount } from '../../lib/popularityTrackingRequired';

export function PopularityTrackingGateRedirect() {
  const pathname = usePathname();
  const router = useRouter();
  const { loggedInAccount } = useAccount();
  const config = useConfig();
  const currentVersion = config.public.legal.popularityTracking.version;
  const promptRequired = isPopularityTrackingPromptRequiredForAccount(
    loggedInAccount,
    currentVersion
  );

  useEffect(() => {
    if (!promptRequired) {
      return;
    }
    if (pathname === ROUTES.POPULARITY_TRACKING) {
      return;
    }
    router.replace(ROUTES.POPULARITY_TRACKING);
  }, [pathname, promptRequired, router]);

  return null;
}
