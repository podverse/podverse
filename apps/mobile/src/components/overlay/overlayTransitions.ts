export type OverlayTransitionKind = 'fade' | 'none' | 'slide';

export const OVERLAY_TRANSITION_ENTER_MS = 200;
export const OVERLAY_TRANSITION_EXIT_MS = 150;
export const OVERLAY_SHEET_TRAVEL = 24;

export const resolveOverlayTransitionDurations = ({
  kind,
  reduceMotion,
}: {
  kind: OverlayTransitionKind;
  reduceMotion: boolean;
}): { enterMs: number; exitMs: number } => {
  if (kind === 'none' || reduceMotion) {
    return { enterMs: 0, exitMs: 0 };
  }

  return {
    enterMs: OVERLAY_TRANSITION_ENTER_MS,
    exitMs: OVERLAY_TRANSITION_EXIT_MS,
  };
};
