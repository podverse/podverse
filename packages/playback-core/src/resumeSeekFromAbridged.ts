import { clampNearEndSeconds } from './clampNearEndSeconds.js';
import { parsePlaybackSeconds } from './parsePlaybackSeconds.js';

export type AbridgedSeekInput = {
  p?: unknown;
  d?: unknown;
};

export type ResumeSeekFromAbridgedParams = {
  abridged: AbridgedSeekInput | null | undefined;
  explicitSeconds?: unknown;
  durationHintSeconds?: unknown;
};

/**
 * Resolve the final seek position seconds for a resume-style load.
 *
 * Precedence (mirrors the decision-matrix anonymous-restore and
 * queue-load rows):
 *
 * 1. **Explicit caller-supplied seconds win.** When the caller passes a
 *    finite non-negative `explicitSeconds` (snapshot, queue
 *    `playback_position`, etc.), that value is used and the same
 *    near-end clamp applies when a duration hint is available.
 * 2. **Invalid explicit falls through** (negative, NaN, non-finite,
 *    non-numeric, empty string, `null`, `undefined`). Treated as no
 *    explicit override, the helper then reads the abridged row.
 * 3. **Abridged `p`/`d` parsed via `parsePlaybackSeconds`.** Either may
 *    independently fail to parse; missing `p` resolves to `0`, missing
 *    `d` disables the near-end clamp.
 * 4. **`clampNearEndSeconds` applied** to the parsed abridged values.
 *
 * Used by `resolvePlaybackLoadDecision` for item / clip / soundbite resume paths.
 */
export function resumeSeekFromAbridged({
  abridged,
  durationHintSeconds,
  explicitSeconds,
}: ResumeSeekFromAbridgedParams): number {
  const durationSeconds =
    parsePlaybackSeconds(abridged?.d) ?? parsePlaybackSeconds(durationHintSeconds) ?? 0;

  const parsedExplicit = parsePlaybackSeconds(explicitSeconds);
  if (parsedExplicit !== undefined) {
    return durationSeconds > 0
      ? clampNearEndSeconds({ currentSeconds: parsedExplicit, durationSeconds })
      : parsedExplicit;
  }

  const currentSeconds = parsePlaybackSeconds(abridged?.p) ?? 0;
  return clampNearEndSeconds({ currentSeconds, durationSeconds });
}
