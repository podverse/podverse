import type { MetadataRoute } from 'next';

import { optionalEnvString } from '@podverse/helpers-config';

import { getConfigResolved } from '../config/loadPublicClientConfig.server';
import { getRuntimeConfig } from '../config/runtime-config-store';

/**
 * Web app manifest. `name` and `short_name` follow the resolved public brand name. An empty
 * name falls back to `NEXT_PUBLIC_BRAND_NAME`, then Podverse. Icon and theme URLs stay on the
 * runtime env and default under /favicon/* when unset.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { env } = getRuntimeConfig();
  const resolvedName = (await getConfigResolved()).public.brand.name;
  const name =
    resolvedName === ''
      ? (optionalEnvString(env.NEXT_PUBLIC_BRAND_NAME) ?? 'Podverse')
      : resolvedName;
  const shortName = name;
  const icon192 =
    optionalEnvString(env.NEXT_PUBLIC_BRAND_APP_ICON_192_URL) ??
    '/favicon/web-app-manifest-192x192.png';
  const icon512 =
    optionalEnvString(env.NEXT_PUBLIC_BRAND_APP_ICON_512_URL) ??
    '/favicon/web-app-manifest-512x512.png';
  const theme = optionalEnvString(env.NEXT_PUBLIC_BRAND_THEME_COLOR) ?? '#ffffff';
  const background = optionalEnvString(env.NEXT_PUBLIC_BRAND_BACKGROUND_COLOR) ?? '#ffffff';

  return {
    name,
    short_name: shortName,
    icons: [
      {
        src: icon192,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: icon512,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    theme_color: theme,
    background_color: background,
    display: 'standalone',
  };
}
