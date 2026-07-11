const SHRINK_OBJECT_KEY_PATTERN =
  /^images\/(channel|item)\/\d+\/[a-f0-9]{64}-w\d+-c[a-f0-9]{16}\.webp$/;

/**
 * Object key produced by the image-shrink upload pipeline
 * (`images/{entity}/{id}/{urlHash}-w{width}-c{checksumPrefix}.webp`).
 */
export const isShrinkGeneratedObjectKey = (key: string): boolean => {
  return SHRINK_OBJECT_KEY_PATTERN.test(key);
};

const objectKeyFromPublicUrl = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    return parsed.pathname.replace(/^\/+/, '');
  } catch {
    return null;
  }
};

/**
 * Resized CDN row URL that points at a shrink-generated object for the configured CDN base.
 */
export const isShrinkResizedPublicUrl = (params: { url: string; cdnBaseUrl: string }): boolean => {
  const base = params.cdnBaseUrl.replace(/\/+$/, '');
  if (!params.url.startsWith(`${base}/`)) {
    return false;
  }
  const key = objectKeyFromPublicUrl(params.url);
  if (key === null) {
    return false;
  }
  return isShrinkGeneratedObjectKey(key);
};
