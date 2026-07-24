/**
 * RN component for the ONE shared native video surface (Plan 01 reparent; detail 099 addendum).
 *
 * Mini player and full player each mount one of these with a `targetId` (`mini` / `full`). The
 * native `PodverseVideoSurfaceView` registers itself with `PodverseVideoSurfaceHost`, which
 * reparents the single `AVPlayerLayer` (iOS) / `SurfaceView` (Android) into whichever is the active
 * target. Because this view lives in the RN tree, the surface renders with correct z-order even when
 * the full player is a native-stack modal — the previous window/content overlay was occluded by it.
 *
 * Never mounts a second player/`<Video>` (Track 11.18): both instances point at the same native
 * surface; only one is the active reparent target at a time (driven by `animateVideoSurface`).
 *
 * Imports the native view, so this file must only be used on a device/simulator with the module
 * built in (not from Node unit tests).
 */
import { requireNativeView } from 'expo';
import type { StyleProp, ViewStyle } from 'react-native';

import type { VideoSurfaceTargetId } from './types';

export type PodverseVideoSurfaceViewProps = {
  targetId: VideoSurfaceTargetId;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const NativeVideoSurfaceView =
  requireNativeView<PodverseVideoSurfaceViewProps>('PodverseMediaEngine');

export function PodverseVideoSurfaceView(props: PodverseVideoSurfaceViewProps) {
  return <NativeVideoSurfaceView {...props} />;
}
