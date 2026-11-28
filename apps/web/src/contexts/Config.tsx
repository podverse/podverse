'use client';

import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';

import type { ResolvedWebConfig } from '../config/publicClientConfig';
import { bindWebListScreenDefaults } from '../lib/listScreenDefaults';

export const ConfigContext = createContext<ResolvedWebConfig | null>(null);

type ConfigProviderProps = {
  children: ReactNode;
  config: ResolvedWebConfig;
};

export const ConfigProvider = ({ children, config }: ConfigProviderProps) => {
  bindWebListScreenDefaults(config.public.listScreens);
  return <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>;
};

export function useConfig(): ResolvedWebConfig {
  const config = useContext(ConfigContext);
  if (config === null) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return config;
}
