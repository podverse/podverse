/**
 * Public URL paths for embed demo static assets under apps/web/public/.
 * Served by the web app at /embed-demo/audio/* and /embed-demo/images/*.
 */

export const EMBED_DEMO_PUBLIC_AUDIO_PATH = '/embed-demo/audio';
export const EMBED_DEMO_PUBLIC_VIDEOS_PATH = '/embed-demo/videos';
export const EMBED_DEMO_PUBLIC_IMAGES_PATH = '/embed-demo/images';

const DEFAULT_LOCAL_WEB_ORIGIN = 'http://localhost:3002';
const DEFAULT_E2E_WEB_ORIGIN = 'http://localhost:4032';

function stripTrailingSlash(origin) {
  return origin.replace(/\/$/, '');
}

/**
 * Absolute web origin for seeded embed demo asset URLs (audio enclosures, artwork).
 * Set EMBED_DEMO_WEB_ORIGIN when seeding (e2e_seed_web uses the E2E web port).
 */
export function resolveEmbedDemoWebOrigin() {
  if (process.env.EMBED_DEMO_WEB_ORIGIN) {
    return stripTrailingSlash(process.env.EMBED_DEMO_WEB_ORIGIN);
  }

  if (process.env.E2E_WEB_ORIGIN) {
    return stripTrailingSlash(process.env.E2E_WEB_ORIGIN);
  }

  if (process.env.DB_PORT === '5732' || process.env.DB_APP_NAME === 'podverse_app_test') {
    return DEFAULT_E2E_WEB_ORIGIN;
  }

  return DEFAULT_LOCAL_WEB_ORIGIN;
}

export function resolveEmbedDemoAudioBaseUrl() {
  return `${resolveEmbedDemoWebOrigin()}${EMBED_DEMO_PUBLIC_AUDIO_PATH}`;
}

export function resolveEmbedDemoImagesBaseUrl() {
  return `${resolveEmbedDemoWebOrigin()}${EMBED_DEMO_PUBLIC_IMAGES_PATH}`;
}

export function resolveEmbedDemoVideosBaseUrl() {
  return `${resolveEmbedDemoWebOrigin()}${EMBED_DEMO_PUBLIC_VIDEOS_PATH}`;
}
