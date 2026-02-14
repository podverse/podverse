'use client';

import { useEffect } from 'react';
import { getApiRequestService } from '../../factories/apiRequestService';

interface AuthSessionCheckerProps {
  ssrShouldLogout: boolean;
}

const AuthSessionChecker = ({ ssrShouldLogout }: AuthSessionCheckerProps) => {
  useEffect(() => {
    if (ssrShouldLogout) {
      (async () => {
        try {
          await getApiRequestService().reqAuthLogout();
        } catch {
          // Logout may fail if session is already invalid, that's ok
        }
        // Reload to clear client state and show logged-out UI
        window.location.reload();
      })();
    }
  }, [ssrShouldLogout]);

  return null;
};

export default AuthSessionChecker;
