import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

import type { DTOAccount } from '@podverse/helpers';

import { syncListenStatsGateFromAccount } from '../utils/statsTracking/statsTracking';
import { useLocalSettings } from './LocalSettings';

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
  const { preferredMediaType, setPreferredMediaType } = useLocalSettings();

  useEffect(() => {
    syncListenStatsGateFromAccount(loggedInAccount);
  }, [loggedInAccount]);

  // DB wins for logged-in users: reconcile the account's saved preferred media
  // type into the device-level local-settings cookie (mirrors NEXT_LOCALE sync).
  // Anonymous users keep their cookie-only preference.
  useEffect(() => {
    const dbPreferred =
      loggedInAccount?.account_settings?.account_settings_playback?.preferred_media_type;
    if (
      (dbPreferred === 'audio' || dbPreferred === 'video') &&
      dbPreferred !== preferredMediaType
    ) {
      setPreferredMediaType(dbPreferred);
    }
  }, [loggedInAccount, preferredMediaType, setPreferredMediaType]);

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
