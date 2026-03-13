import { IMAGE_SIZES, MAX_JPEG_FILES } from './generate-feed-constants.js';

export function pad3(n: number): string {
  return n.toString().padStart(3, '0');
}

/** Image pool size so that imagePoolSize * IMAGE_SIZES.length ≤ MAX_JPEG_FILES. */
export function getImagePoolSize(poolSize: number): number {
  return Math.min(poolSize, Math.floor(MAX_JPEG_FILES / IMAGE_SIZES.length));
}

/** Build podcast:images srcset value (e.g. "url1 300w, url2 600w, url3 1400w"). */
export function buildPodcastImagesSrcset(baseUrl: string, indexPad: string): string {
  const base = baseUrl.replace(/\/$/, '');
  return IMAGE_SIZES.map((w) => `${base}/images/image-${indexPad}-${w}.jpg ${w}w`).join(', ');
}
