/**
 * Hook to obtain the native playback bridge and subscribe to engine events.
 *
 * Screens use this instead of importing the native module. Pass partial event handlers; they are
 * kept in a ref so the subscription is registered once and always calls the latest handler.
 */

import { useEffect, useRef } from 'react';

import type { NativePlaybackEvents } from '../../modules/podverse-media-engine';
import {
  normalizePlaybackError,
  normalizeProgressEvent,
} from '../../modules/podverse-media-engine';
import type { PlaybackEventSubscription, PodversePlaybackBridge } from './nativePlaybackBridge';
import { nativePlaybackBridge } from './nativePlaybackBridge';

export function useNativePlaybackBridge(
  handlers?: Partial<NativePlaybackEvents>
): PodversePlaybackBridge {
  const handlersRef = useRef<Partial<NativePlaybackEvents> | undefined>(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    // Subscribe per event so each listener payload type is inferred precisely (no type assertions).
    const subscriptions: PlaybackEventSubscription[] = [
      nativePlaybackBridge.addListener('playbackState', (event) => {
        handlersRef.current?.playbackState?.(event);
      }),
      // Raw `progress` and `error` are normalized here: live fields and a live duration of 0 on
      // progress, and a stable `kind` on error, so consumers can read the public shapes.
      nativePlaybackBridge.addListener('progress', (event) => {
        handlersRef.current?.progress?.(normalizeProgressEvent(event));
      }),
      nativePlaybackBridge.addListener('ended', (event) => {
        handlersRef.current?.ended?.(event);
      }),
      nativePlaybackBridge.addListener('error', (payload) => {
        handlersRef.current?.error?.(normalizePlaybackError(payload));
      }),
      nativePlaybackBridge.addListener('stalled', (event) => {
        handlersRef.current?.stalled?.(event);
      }),
      nativePlaybackBridge.addListener('sourceChanged', (event) => {
        handlersRef.current?.sourceChanged?.(event);
      }),
    ];
    return () => {
      subscriptions.forEach((subscription) => {
        subscription.remove();
      });
    };
  }, []);

  return nativePlaybackBridge;
}
