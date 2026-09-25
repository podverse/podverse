import type { ImageRef } from 'expo-image';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { PixelRatio, Platform } from 'react-native';

import { perfCount } from '../../lib/perf/perfSpans';
import {
  createThumbnailCache,
  isThumbnailEligibleUri,
  thumbnailEdgePx,
} from './coverThumbnailCache';

const thumbnailCache = createThumbnailCache<ImageRef>(async (uri, edgePx) => {
  try {
    // Native ImageSource accepts `scale`; the public TS type omits it. A variable (not a fresh
    // literal) keeps the field without a type assertion.
    const source = { scale: PixelRatio.get(), uri };
    const ref = await Image.loadAsync(source, { maxHeight: edgePx, maxWidth: edgePx });
    perfCount('image.thumb.load');
    return ref;
  } catch (error) {
    perfCount('image.thumb.fallback');
    throw error;
  }
});

export type CoverThumbnail =
  | { status: 'off' }
  | { status: 'loading' }
  | { status: 'failed' }
  | { ref: ImageRef; status: 'ready' };

type HeldThumbnail = { key: string; ref: ImageRef | null };

/**
 * iOS list and grid artwork: a thumbnail decoded off the main thread at the displayed pixel size,
 * tagged with the screen scale so the layer draws 1:1 instead of minifying a 1x-tagged bitmap.
 * The plain expo-image path keeps the full-size original and scales it on the main thread each
 * time a cell shows it, which stalls a list that mounts many cells in one commit. Android already
 * decodes at view size off the main thread, so this is `off` there, for animated GIFs, and when no
 * edge is given.
 */
export function useCoverThumbnail(
  uri: string | null,
  edgePoints: number | undefined
): CoverThumbnail {
  const edgePx =
    Platform.OS === 'ios' &&
    uri !== null &&
    isThumbnailEligibleUri(uri) &&
    edgePoints !== undefined &&
    Number.isFinite(edgePoints) &&
    edgePoints > 0
      ? thumbnailEdgePx(edgePoints, PixelRatio.get())
      : null;
  const key = uri !== null && edgePx !== null ? `${edgePx}|${uri}` : null;
  const [held, setHeld] = useState<HeldThumbnail | null>(null);
  const heldForKey = held !== null && held.key === key ? held : null;
  const cached = uri !== null && edgePx !== null ? thumbnailCache.get(uri, edgePx) : null;
  const ref = cached ?? heldForKey?.ref ?? null;
  const failed = ref === null && heldForKey !== null;

  useEffect(() => {
    if (uri === null || edgePx === null || ref !== null || failed) {
      return;
    }
    let isCurrent = true;
    const requestKey = `${edgePx}|${uri}`;
    thumbnailCache.load(uri, edgePx).then(
      (loaded) => {
        if (isCurrent) {
          setHeld({ key: requestKey, ref: loaded });
        }
      },
      () => {
        if (isCurrent) {
          setHeld({ key: requestKey, ref: null });
        }
      }
    );
    return () => {
      isCurrent = false;
    };
  }, [edgePx, failed, ref, uri]);

  if (key === null) {
    return { status: 'off' };
  }
  if (ref !== null) {
    return { ref, status: 'ready' };
  }
  return failed ? { status: 'failed' } : { status: 'loading' };
}
