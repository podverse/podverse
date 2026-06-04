/* eslint-disable @typescript-eslint/no-non-null-assertion -- env vars validated at build time in scripts/validate-env.ts */

import type { AccountSignupMode } from '@podverse/helpers';
import { DEFAULT_STATS_TRACK_EVENT_RETENTION_DAYS } from '@podverse/helpers';
import { optionalEnvString, parseSidebarGroupOrder } from '@podverse/helpers-config';
import { buildObservabilityConfigFromEnv } from '@podverse/observability/config';

import { ASSETS } from '../constants/assets';
import { getRuntimeConfig } from './runtime-config-store';

const parsePositiveIntWithDefault = (raw: string | undefined, defaultValue: number): number => {
  if (raw === undefined || raw.trim() === '') {
    return defaultValue;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
};

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
        name: env.NEXT_PUBLIC_BRAND_NAME!,
        domain: env.NEXT_PUBLIC_BRAND_DOMAIN!,
        logoDark: optionalEnvString(env.NEXT_PUBLIC_BRAND_LOGO_DARK) ?? ASSETS.IMAGES.BRANDING.BRAND.LOGO_DARK,
        logoLight: optionalEnvString(env.NEXT_PUBLIC_BRAND_LOGO_LIGHT) ?? ASSETS.IMAGES.BRANDING.BRAND.LOGO,
      },
      api: {
        ssr: {
          protocol: env.NEXT_PUBLIC_SSR_API_PROTOCOL!,
          host: env.NEXT_PUBLIC_SSR_API_HOST!,
          port: env.NEXT_PUBLIC_SSR_API_PORT!,
        },
        client: {
          protocol: env.NEXT_PUBLIC_API_PROTOCOL!,
          host: env.NEXT_PUBLIC_API_HOST!,
          port: env.NEXT_PUBLIC_API_PORT!,
        },
        prefix: env.NEXT_PUBLIC_API_PREFIX!,
        version: env.NEXT_PUBLIC_API_VERSION!,
      },
      web: {
        protocol: env.NEXT_PUBLIC_WEB_PROTOCOL!,
        host: env.NEXT_PUBLIC_WEB_DOMAIN!,
      },
      app_value: {
        lightning_lnaddress: {
          name: optionalEnvString(env.NEXT_PUBLIC_APP_VALUE_LIGHTNING_LNADDRESS_NAME),
          address: optionalEnvString(env.NEXT_PUBLIC_APP_VALUE_LIGHTNING_LNADDRESS_ADDRESS),
        },
        lightning_node: {
          name: optionalEnvString(env.NEXT_PUBLIC_APP_VALUE_LIGHTNING_NODE_NAME),
          address: optionalEnvString(env.NEXT_PUBLIC_APP_VALUE_LIGHTNING_NODE_ADDRESS),
          custom_key: optionalEnvString(env.NEXT_PUBLIC_APP_VALUE_LIGHTNING_NODE_CUSTOM_KEY),
          custom_value: optionalEnvString(env.NEXT_PUBLIC_APP_VALUE_LIGHTNING_NODE_CUSTOM_VALUE),
        },
        metaboost: {
          standard: optionalEnvString(env.NEXT_PUBLIC_APP_VALUE_METABOOST_STANDARD),
          node: optionalEnvString(env.NEXT_PUBLIC_APP_VALUE_METABOOST_NODE),
        },
      },
      polling: {
        interval_ms: Number(env.NEXT_PUBLIC_POLLING_INTERVAL_MS!),
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
      notifications: {
        webpush: {
          vapidPublicKey: env.NEXT_PUBLIC_WEBPUSH_VAPID_PUBLIC_KEY!,
        },
      },
      socials: {
        activityPub: env.NEXT_PUBLIC_SOCIAL_ACTIVITY_PUB!,
        discord: env.NEXT_PUBLIC_SOCIAL_DISCORD!,
        github: env.NEXT_PUBLIC_SOCIAL_GITHUB!,
        matrix: env.NEXT_PUBLIC_SOCIAL_MATRIX!,
        x: env.NEXT_PUBLIC_SOCIAL_X!,
      },
      contact: {
        email: env.NEXT_PUBLIC_CONTACT_EMAIL!,
      },
      legal: {
        name: env.NEXT_PUBLIC_LEGAL_NAME!,
        terms: {
          version: env.NEXT_PUBLIC_TERMS_OF_SERVICE_VERSION!,
        },
      },
      stats: {
        trackEventRetentionDays: parsePositiveIntWithDefault(
          env.NEXT_PUBLIC_STATS_TRACK_EVENT_RETENTION_DAYS,
          DEFAULT_STATS_TRACK_EVENT_RETENTION_DAYS
        ),
      },
      cookieConsent: {
        bannerEnabled: env.NEXT_PUBLIC_COOKIE_CONSENT_BANNER_ENABLED === 'true',
      },
      account: {
        signupMode: env.NEXT_PUBLIC_ACCOUNT_SIGNUP_MODE! as AccountSignupMode,
        contactEmail: env.NEXT_PUBLIC_CONTACT_EMAIL!,
      },
      server_env: env.NEXT_PUBLIC_SERVER_ENV!,
      imageProxy: {
        enabled: env.NEXT_PUBLIC_IMAGE_PROXY_ENABLED === 'true',
      },
      nextImageOptimization: {
        enabled: env.NEXT_PUBLIC_NEXT_IMAGE_OPTIMIZATION_ENABLED === 'true',
      },
      sidebar: {
        groupOrder: parseSidebarGroupOrder(optionalEnvString(env.NEXT_PUBLIC_SIDEBAR_GROUP_ORDER)),
      },
    },
    proxy: {
      responseCacheMaxAgeSeconds: Number(env.NEXT_PUBLIC_PROXY_RESPONSE_CACHE_MAX_AGE_SECONDS!),
      userAgent: env.NEXT_PUBLIC_PROXY_USER_AGENT ?? '',
    },
  };
};

export type WebConfig = ReturnType<typeof buildConfig>;

export const getConfig = (): WebConfig => buildConfig();

export const getWebOrigin = (): string => {
  const c = getConfig();
  return `${c.public.web.protocol}://${c.public.web.host}`;
};
