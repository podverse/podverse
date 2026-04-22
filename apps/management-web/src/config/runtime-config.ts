export type ManagementWebRuntimeConfigEnvKey =
  | 'NEXT_PUBLIC_API_HOST'
  | 'NEXT_PUBLIC_API_PORT'
  | 'NEXT_PUBLIC_API_PREFIX'
  | 'NEXT_PUBLIC_API_PROTOCOL'
  | 'NEXT_PUBLIC_API_VERSION'
  | 'NEXT_PUBLIC_BRAND_DOMAIN'
  | 'NEXT_PUBLIC_BRAND_NAME'
  | 'NEXT_PUBLIC_FEATURES_DEFAULT_LOCALE'
  | 'NEXT_PUBLIC_FEATURES_SUPPORTED_LOCALES'
  | 'NEXT_PUBLIC_SSR_API_HOST'
  | 'NEXT_PUBLIC_SSR_API_PORT'
  | 'NEXT_PUBLIC_SSR_API_PROTOCOL';

export const managementWebRuntimeConfigEnvKeys = {
  required: [
    'NEXT_PUBLIC_API_HOST',
    'NEXT_PUBLIC_API_PREFIX',
    'NEXT_PUBLIC_API_PROTOCOL',
    'NEXT_PUBLIC_API_VERSION',
    'NEXT_PUBLIC_FEATURES_DEFAULT_LOCALE',
    'NEXT_PUBLIC_FEATURES_SUPPORTED_LOCALES',
    'NEXT_PUBLIC_SSR_API_HOST',
    'NEXT_PUBLIC_SSR_API_PORT',
    'NEXT_PUBLIC_SSR_API_PROTOCOL',
  ],
  optional: ['NEXT_PUBLIC_API_PORT', 'NEXT_PUBLIC_BRAND_DOMAIN', 'NEXT_PUBLIC_BRAND_NAME'],
} as const;

export type ManagementWebRuntimeConfigValues = {
  [K in ManagementWebRuntimeConfigEnvKey]: string | undefined;
};

export type ManagementWebRuntimeConfig = {
  env: ManagementWebRuntimeConfigValues;
};
