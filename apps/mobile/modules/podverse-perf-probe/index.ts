/**
 * Dev/E2E UI-thread frame probe. Start/stop around a scroll or chip gesture; snapshot returns
 * gap stats collected while the probe was running.
 */

export type { FrameProbeSnapshot, FrameStamp, LongFrame } from './src/types';
export {
  getPodversePerfProbeModule,
  isPodversePerfProbeAvailable,
} from './src/PodversePerfProbeModule';
export type { PodversePerfProbeNativeModule } from './src/PodversePerfProbeModule';
