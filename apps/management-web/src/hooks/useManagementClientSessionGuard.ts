'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import type { CurrentUser } from '../lib/requests/auth';
import { getCurrentUser } from '../lib/requests/auth';

export type UseManagementClientSessionGuardOptions = {
  /** When false, skip session verification (user stays `initialUser`). */
  enabled?: boolean;
  /** Called before redirect when the session is missing or verification throws. */
  onInvalid?: () => void;
  /** Called after a successful `/auth/me` response with a non-null user. */
  onValid?: (user: CurrentUser) => void;
  /** Next.js router `replace` target when unauthenticated; default login route. */
  redirectPath?: string;
};

/**
 * Client-side session re-check for management pages that already received a server-validated user.
 * Aligns behavior across pages: `/auth/me`, redirect on null/unauthorized, refresh user state when valid.
 */
export function useManagementClientSessionGuard(
  initialUser: CurrentUser,
  options?: UseManagementClientSessionGuardOptions
): CurrentUser {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser>(initialUser);

  const enabled = options?.enabled ?? true;
  const redirectPath = options?.redirectPath ?? '/';

  const onValidRef = useRef(options?.onValid);
  const onInvalidRef = useRef(options?.onInvalid);
  onValidRef.current = options?.onValid;
  onInvalidRef.current = options?.onInvalid;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    const verify = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (cancelled) {
          return;
        }
        if (currentUser === null) {
          onInvalidRef.current?.();
          router.replace(redirectPath);
          return;
        }
        setUser(currentUser);
        onValidRef.current?.(currentUser);
      } catch {
        if (!cancelled) {
          onInvalidRef.current?.();
          router.replace(redirectPath);
        }
      }
    };

    void verify();

    return () => {
      cancelled = true;
    };
  }, [enabled, redirectPath, router]);

  return user;
}
