import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

import type { DTOAccount } from '@podverse/helpers';

import { syncListenStatsGateFromAccount } from '../utils/statsTracking/statsTracking';

type AccountContextType = {
  loggedInAccount: DTOAccount | null;
  setLoggedInAccount: (val: DTOAccount | null) => void;
};

export const AccountContext = createContext<AccountContextType>({
  loggedInAccount: null,
  setLoggedInAccount: () => {},
});

type AccountProviderProps = {
  children: ReactNode;
  ssrLoggedInAccount?: DTOAccount | null;
};

export const AccountProvider = ({ children, ssrLoggedInAccount = null }: AccountProviderProps) => {
  const [loggedInAccount, setLoggedInAccount] = useState<DTOAccount | null>(ssrLoggedInAccount);

  useEffect(() => {
    syncListenStatsGateFromAccount(loggedInAccount);
  }, [loggedInAccount]);

  return (
    <AccountContext.Provider value={{ loggedInAccount, setLoggedInAccount }}>
      {children}
    </AccountContext.Provider>
  );
};

export function useAccount() {
  const ctx = useContext(AccountContext);
  if (!ctx) {
    throw new Error('useAccount must be used within an AccountProvider');
  }
  return ctx;
}
