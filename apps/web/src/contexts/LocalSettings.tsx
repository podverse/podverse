import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UITheme } from '../utils/localSettings/uiTheme';
import { toUITheme } from '../utils/localSettings/uiTheme';
import type { ViewSelectedOption } from '../components/ViewSelector/ViewSelector';
import type { LocalSettingsState } from '../utils/localSettings/localSettings';
import {
  handleLocalSettingsUpdate,
  getParsedLocalSettings,
} from '../utils/localSettings/localSettings';

type LocalSettingsContextType = {
  uiTheme: UITheme;
  setUITheme: (uiTheme: UITheme) => void;
  viewSelected: ViewSelectedOption;
  setViewSelected: (view: ViewSelectedOption) => void;
  serverEnvironmentDisclaimerAccepted: boolean;
  setServerEnvironmentDisclaimerAccepted: (accepted: boolean) => void;
  lsAutoQueueConfig: LocalSettingsState['aqc'];
  setLSAutoQueueConfig: React.Dispatch<React.SetStateAction<LocalSettingsState['aqc']>>;
  sidebarAccordion: LocalSettingsState['sba'];
  setSidebarAccordion: React.Dispatch<React.SetStateAction<LocalSettingsState['sba']>>;
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
    ssrLocalSettings.sba || { podcasts: true, music: true, addByRSS: true, library: true }
  );

  useEffect(() => {
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
    });
  }, [
    uiTheme,
    viewSelected,
    serverEnvironmentDisclaimerAccepted,
    lsAutoQueueConfig,
    sidebarAccordion,
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
        sidebarAccordion,
        setSidebarAccordion,
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
