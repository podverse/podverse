import { useMemo } from 'react';

import { useAuth } from '../auth/AuthProvider';
import type { AddByRssParsePath } from '../lib/addByRss/parsePath';
import { resolveAddByRssParsePath } from '../lib/addByRss/parsePath';

/** Which parse this user's Add by RSS actions use right now. */
export const useAddByRssParsePath = (): AddByRssParsePath => {
  const { account, status } = useAuth();
  return useMemo(
    () => resolveAddByRssParsePath(account, { isAuthenticated: status === 'authenticated' }),
    [account, status]
  );
};
