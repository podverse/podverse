/* eslint-disable @typescript-eslint/no-non-null-assertion -- env vars validated at build time in scripts/validate-env.ts */

import { getRuntimeConfig } from './runtime-config-store';

const buildConfig = () => {
  const { env } = getRuntimeConfig();

  return {
    public: {
      brand: {
        name: env.NEXT_PUBLIC_BRAND_NAME,
      },
      api: {
        client: {
          protocol: env.NEXT_PUBLIC_API_PROTOCOL!,
          host: env.NEXT_PUBLIC_API_HOST!,
          port: env.NEXT_PUBLIC_API_PORT,
        },
        prefix: env.NEXT_PUBLIC_API_PREFIX!,
        version: env.NEXT_PUBLIC_API_VERSION!,
      },
      features: {
        locales: {
          supported: env.NEXT_PUBLIC_FEATURES_SUPPORTED_LOCALES!,
          default: env.NEXT_PUBLIC_FEATURES_DEFAULT_LOCALE!,
        },
      },
    },
  };
};

export type ManagementWebConfig = ReturnType<typeof buildConfig>;

export const getConfig = (): ManagementWebConfig => buildConfig();
