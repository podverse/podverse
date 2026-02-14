'use client';

import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';

import type { WebConfig } from '../config';

export const ConfigContext = createContext<WebConfig | null>(null);

type ConfigProviderProps = {
  children: ReactNode;
  config: WebConfig;
};

export const ConfigProvider = ({ children, config }: ConfigProviderProps) => {
  return <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>;
};

export function useConfig(): WebConfig {
  const config = useContext(ConfigContext);
  if (config === null) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return config;
}
