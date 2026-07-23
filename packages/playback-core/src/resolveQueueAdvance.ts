/**
 * Pure ended/skip advance policy shared by web and mobile.
 *
 * Mirrors the decision order in web `NonLiveMediaOrchestrator` `onEnded`
 * (`apps/web/src/components/MediaPlayer/Controller/NonLiveMediaOrchestrator.tsx`):
 * play the next manual upcoming item first; otherwise advance the auto-queue; otherwise stop.
 *
 * Side-effect free so both clients (and Vitest) share identical ordering. Callers own the effects
 * (move-to-history, load-active, native bridge load) — this only decides which path to take.
 */
export type QueueAdvanceInput = {
  /** Count of manual upcoming items available to play next (0 when the manual queue is exhausted). */
  upcomingManualCount: number;
  /** Whether the auto-queue buffer (or its source) can still provide a next resource. */
  hasAutoQueueNext: boolean;
};

export type QueueAdvanceDecision =
  { kind: 'play-next-manual' } | { kind: 'advance-auto-queue' } | { kind: 'stop' };

export function resolveQueueAdvance(input: QueueAdvanceInput): QueueAdvanceDecision {
  if (input.upcomingManualCount > 0) {
    return { kind: 'play-next-manual' };
  }
  if (input.hasAutoQueueNext) {
    return { kind: 'advance-auto-queue' };
  }
  return { kind: 'stop' };
}
