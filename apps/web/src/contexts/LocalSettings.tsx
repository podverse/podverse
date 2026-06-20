import React, { createContext, useContext, useLayoutEffect, useState } from 'react';

import type { MediaTypePreference } from '@podverse/helpers';

import type { ViewSelectedOption } from '../components/ViewSelector/ViewSelector';
import { COOKIE_CONSENT_MODEL_VERSION } from '../lib/cookieConsent/cookieConsentPolicy';
import { clearAnonymousPlaybackSnapshot } from '../utils/anonymousPlaybackStorage';
import type {
  BoostFormDefaultsByValueKey,
  CookieConsentChoice,
  CookieConsentState,
  LocalSettingsState,
} from '../utils/localSettings/localSettings';
import {
  DEFAULT_SIDEBAR_ACCORDION_STATE,
  getParsedLocalSettings,
  handleLocalSettingsUpdate,
} from '../utils/localSettings/localSettings';
import type { UITheme } from '../utils/localSettings/uiTheme';
import { toUITheme } from '../utils/localSettings/uiTheme';

type LocalSettingsContextType = {
  uiTheme: UITheme;
  setUITheme: (uiTheme: UITheme) => void;
  viewSelected: ViewSelectedOption;
  setViewSelected: (view: ViewSelectedOption) => void;
  serverEnvironmentDisclaimerAccepted: boolean;
  setServerEnvironmentDisclaimerAccepted: (accepted: boolean) => void;
  lsAutoQueueConfig: LocalSettingsState['aqc'];
  setLSAutoQueueConfig: React.Dispatch<React.SetStateAction<LocalSettingsState['aqc']>>;
  /** Mobile overlay sidebar open (session-only; not persisted). */
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  sidebarAccordion: LocalSettingsState['sba'];
  setSidebarAccordion: React.Dispatch<React.SetStateAction<LocalSettingsState['sba']>>;
  boostFormDefaults: BoostFormDefaultsByValueKey;
  setBoostFormDefaults: React.Dispatch<React.SetStateAction<BoostFormDefaultsByValueKey>>;
  cookieConsent: CookieConsentState | undefined;
  setCookieConsent: (choice: CookieConsentChoice) => void;
  preferredMediaType: MediaTypePreference;
  setPreferredMediaType: (pmt: MediaTypePreference) => void;
};

type LocalSettingsProps = {
  ssrLocalSettings: LocalSettingsState;
  children: React.ReactNode;
};

const LocalSettingsContext = createContext<LocalSettingsContextType | undefined>(undefined);

export const LocalSettingsProvider: React.FC<LocalSettingsProps> = ({
  ssrLocalSettings,
  children,
}) => {
  const [uiTheme, setUITheme] = useState<UITheme>(toUITheme(ssrLocalSettings.uit));
  const [viewSelected, setViewSelected] = useState<ViewSelectedOption>(ssrLocalSettings.vs);
  const [serverEnvironmentDisclaimerAccepted, setServerEnvironmentDisclaimerAccepted] =
    useState<boolean>(ssrLocalSettings.seda);
  const [lsAutoQueueConfig, setLSAutoQueueConfig] = useState(
    ssrLocalSettings.aqc || { rp: false, rd: false }
  );
  const [sidebarAccordion, setSidebarAccordion] = useState(
    ssrLocalSettings.sba ?? DEFAULT_SIDEBAR_ACCORDION_STATE
  );
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [boostFormDefaults, setBoostFormDefaults] = useState<BoostFormDefaultsByValueKey>(
    ssrLocalSettings.bfd ?? {}
  );
  const [cookieConsent, setCookieConsentState] = useState<CookieConsentState | undefined>(
    ssrLocalSettings.cc
  );
  const [preferredMediaType, setPreferredMediaType] = useState<MediaTypePreference>(
    ssrLocalSettings.pmt ?? 'video'
  );

  const setCookieConsent = (choice: CookieConsentChoice) => {
    if (choice === 'none') {
      clearAnonymousPlaybackSnapshot();
    }
    setCookieConsentState({
      choice,
      at: new Date().toISOString(),
      v: COOKIE_CONSENT_MODEL_VERSION,
    });
  };

  useLayoutEffect(() => {
    const existingSettings = getParsedLocalSettings();
    // Remember to update this when new properties are added to the LocalSettingsState
    // or the settings will be lost when the page is refreshed twice.
    handleLocalSettingsUpdate({
      uit: uiTheme,
      vs: viewSelected,
      seda: serverEnvironmentDisclaimerAccepted,
      aqc: lsAutoQueueConfig,
      sba: sidebarAccordion,
      fd: existingSettings.fd,
      metd: existingSettings.metd,
      bfd: boostFormDefaults,
      cc: cookieConsent !== undefined ? cookieConsent : existingSettings.cc,
      pmt: preferredMediaType,
    });
  }, [
    uiTheme,
    viewSelected,
    serverEnvironmentDisclaimerAccepted,
    lsAutoQueueConfig,
    sidebarAccordion,
    boostFormDefaults,
    cookieConsent,
    preferredMediaType,
  ]);

  return (
    <LocalSettingsContext.Provider
      value={{
        uiTheme,
        setUITheme,
        viewSelected,
        setViewSelected,
        serverEnvironmentDisclaimerAccepted,
        setServerEnvironmentDisclaimerAccepted,
        lsAutoQueueConfig,
        setLSAutoQueueConfig,
        mobileSidebarOpen,
        setMobileSidebarOpen,
        sidebarAccordion,
        setSidebarAccordion,
        boostFormDefaults,
        setBoostFormDefaults,
        cookieConsent,
        setCookieConsent,
        preferredMediaType,
        setPreferredMediaType,
      }}
    >
      {children}
    </LocalSettingsContext.Provider>
  );
};

export function useLocalSettings() {
  const ctx = useContext(LocalSettingsContext);
  if (!ctx) {
    throw new Error('useLocalSettings must be used within a LocalSettingsProvider');
  }
  return ctx;
}
