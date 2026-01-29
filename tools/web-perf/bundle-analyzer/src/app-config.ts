export type AppTarget = 'web' | 'management-web';

export interface AppConfig {
  name: string;
  displayName: string;
  path: string; // Relative to monorepo root
  reportsSubdir: string;
}

export const APP_CONFIGS: Record<AppTarget, AppConfig> = {
  web: {
    name: 'web',
    displayName: 'Podverse Web',
    path: 'apps/web',
    reportsSubdir: 'web',
  },
  'management-web': {
    name: 'management-web',
    displayName: 'Podverse Management Web',
    path: 'apps/management-web',
    reportsSubdir: 'management-web',
  },
};

export function getAppConfig(target: AppTarget): AppConfig {
  return APP_CONFIGS[target];
}
