/* eslint-disable @typescript-eslint/no-non-null-assertion -- env vars validated at build time in scripts/validate-env.ts */

import { getRuntimeConfig } from './runtime-config-store';

const buildConfig = () => {
  const { env } = getRuntimeConfig();

  return {
    public: {
      brand: {
        name: env.NEXT_PUBLIC_BRAND_NAME!,
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
        lightning_keysend: {
          name: env.NEXT_PUBLIC_APP_VALUE_LIGHTNING_KEYSEND_NAME!,
          type: env.NEXT_PUBLIC_APP_VALUE_LIGHTNING_KEYSEND_TYPE!,
          address: env.NEXT_PUBLIC_APP_VALUE_LIGHTNING_KEYSEND_ADDRESS!,
          custom_key: env.NEXT_PUBLIC_APP_VALUE_LIGHTNING_KEYSEND_CUSTOM_KEY!,
          custom_value: env.NEXT_PUBLIC_APP_VALUE_LIGHTNING_KEYSEND_CUSTOM_VALUE!,
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
      account: {
        signupMode: env.NEXT_PUBLIC_ACCOUNT_SIGNUP_MODE!,
        contactEmail: env.NEXT_PUBLIC_CONTACT_EMAIL!,
      },
      server_env: env.NEXT_PUBLIC_SERVER_ENV!,
    },
    proxy: {
      userAgent: env.NEXT_PUBLIC_PROXY_USER_AGENT!,
    },
  };
};

export type WebConfig = ReturnType<typeof buildConfig>;

export const getConfig = (): WebConfig => buildConfig();

export const getWebOrigin = (): string => {
  const c = getConfig();
  return `${c.public.web.protocol}://${c.public.web.host}`;
};
