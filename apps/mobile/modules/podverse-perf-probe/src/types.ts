export type FrameProbeSnapshot = {
  frameCount: number;
  maxGapMs: number;
  over17Ms: number;
  over33Ms: number;
};

/** One UI-thread frame gap over the long-frame threshold, reported relative to the drain call. */
export type LongFrame = {
  agoMs: number;
  gapMs: number;
};

/** Display time of a stamped frame, measured from the tap release (`touchMs`, native uptime). */
export type FrameStamp = {
  latencyMs: number;
  tag: string;
  touchMs: number;
};
