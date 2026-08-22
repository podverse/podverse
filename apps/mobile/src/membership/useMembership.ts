import { useMemo } from 'react';

import { useAuth } from '../auth/AuthProvider';
import type { MobileMembershipState } from './membershipStatus';
import { deriveMembershipState } from './membershipStatus';

/**
 * Thin RN-coupled reader: derives the membership state from the current `/auth/me` account in
 * `AuthProvider`. All logic lives in the pure `deriveMembershipState`.
 */
export const useMembership = (): MobileMembershipState => {
  const { account } = useAuth();
  return useMemo(() => deriveMembershipState(account), [account]);
};
