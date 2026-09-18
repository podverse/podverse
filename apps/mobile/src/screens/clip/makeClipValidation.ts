import { SharableStatusEnum } from '@podverse/helpers';

import type { ClipVisibility } from '../../prefs/clipPrefs';

type MakeClipValidationInput = {
  durationSeconds: number;
  endSeconds: number | null;
  startSeconds: number | null;
  title: string;
  visibility: ClipVisibility;
};

export type MakeClipValidationReason = 'end_must_be_after_start' | 'start_required';

export type ValidatedMakeClipForm = {
  endSeconds: number | null;
  startSeconds: number;
  title: string | null;
  visibility: ClipVisibility;
};

const isClipVisibility = (value: number): value is ClipVisibility => {
  return (
    value === SharableStatusEnum.Public ||
    value === SharableStatusEnum.Unlisted ||
    value === SharableStatusEnum.Private
  );
};

const floorSeconds = (value: number): number => {
  return Math.max(0, Math.floor(value));
};

const clampEndSeconds = (endSeconds: number, durationSeconds: number): number => {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return floorSeconds(endSeconds);
  }
  return Math.min(floorSeconds(endSeconds), floorSeconds(durationSeconds));
};

export const validateMakeClipForm = (
  input: MakeClipValidationInput
):
  | { ok: true; value: ValidatedMakeClipForm }
  | { ok: false; reason: MakeClipValidationReason } => {
  if (input.startSeconds === null) {
    return { ok: false, reason: 'start_required' };
  }

  const startSeconds = floorSeconds(input.startSeconds);
  const endSeconds =
    input.endSeconds === null ? null : clampEndSeconds(input.endSeconds, input.durationSeconds);
  if (endSeconds !== null && endSeconds <= startSeconds) {
    return { ok: false, reason: 'end_must_be_after_start' };
  }

  const title = input.title.trim();
  return {
    ok: true,
    value: {
      endSeconds,
      startSeconds,
      title: title.length > 0 ? title : null,
      visibility: isClipVisibility(input.visibility)
        ? input.visibility
        : SharableStatusEnum.Private,
    },
  };
};
