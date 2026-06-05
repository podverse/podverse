/* eslint-disable @typescript-eslint/no-non-null-assertion -- env vars validated at build time in scripts/validate-env.ts */

import { optionalEnvString } from '@podverse/helpers-config';
import { buildObservabilityConfigFromEnv } from '@podverse/observability/config';

import { getRuntimeConfig } from './runtime-config-store';

const buildConfig = () => {
  const runtimeConfig = getRuntimeConfig();
  const { env } = runtimeConfig;

  return {
    observability: buildObservabilityConfigFromEnv(process.env),
    integrations: {
      cloudflare: {
        webAnalytics: runtimeConfig.integrations.cloudflare.webAnalytics,
      },
    },
    public: {
      brand: {
        name: env.NEXT_PUBLIC_BRAND_NAME,
        domain: env.NEXT_PUBLIC_BRAND_DOMAIN,
      },
      api: {
        ssr: {
          protocol: env.NEXT_PUBLIC_SSR_API_PROTOCOL!,
          host: env.NEXT_PUBLIC_SSR_API_HOST!,
          port: env.NEXT_PUBLIC_SSR_API_PORT,
        },
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
      theme: {
        customThemes: runtimeConfig.customThemes,
        customThemesUrl: optionalEnvString(env.NEXT_PUBLIC_CUSTOM_THEMES_URL),
        default: env.NEXT_PUBLIC_DEFAULT_THEME!,
        valid: env.NEXT_PUBLIC_SUPPORTED_THEMES!,
      },
    },
  };
};

export type ManagementWebConfig = ReturnType<typeof buildConfig>;

export const getConfig = (): ManagementWebConfig => buildConfig();
