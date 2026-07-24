/**
 * Hook to obtain the native playback bridge and subscribe to engine events (step 2.11 / detail 090).
 *
 * Screens use this instead of importing the native module. Pass partial event handlers; they are
 * kept in a ref so the subscription is registered once and always calls the latest handler.
 */

import { useEffect, useRef } from 'react';

import type { NativePlaybackEvents } from '../../modules/podverse-media-engine';
import { normalizePlaybackError } from '../../modules/podverse-media-engine';
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
      nativePlaybackBridge.addListener('progress', (event) => {
        handlersRef.current?.progress?.(event);
      }),
      nativePlaybackBridge.addListener('ended', (event) => {
        handlersRef.current?.ended?.(event);
      }),
      // The adapter delivers raw native errors; normalize to a stable `kind` here (2.27) so RN
      // consumers can pick an i18n message off the enum instead of raw native text.
      nativePlaybackBridge.addListener('error', (payload) => {
        handlersRef.current?.error?.(normalizePlaybackError(payload));
      }),
      nativePlaybackBridge.addListener('stalled', (event) => {
        handlersRef.current?.stalled?.(event);
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
