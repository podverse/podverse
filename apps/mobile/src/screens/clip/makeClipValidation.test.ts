import { describe, expect, it } from 'vitest';

import { SharableStatusEnum } from '@podverse/helpers';

import { validateMakeClipForm } from './makeClipValidation';

describe('validateMakeClipForm', () => {
  it('requires a start time', () => {
    const result = validateMakeClipForm({
      durationSeconds: 1800,
      endSeconds: null,
      startSeconds: null,
      title: '',
      visibility: SharableStatusEnum.Private,
    });

    expect(result).toEqual({ ok: false, reason: 'start_required' });
  });

  it('requires end to be greater than start when set', () => {
    const result = validateMakeClipForm({
      durationSeconds: 1800,
      endSeconds: 120,
      startSeconds: 120,
      title: 'Clip',
      visibility: SharableStatusEnum.Public,
    });

    expect(result).toEqual({ ok: false, reason: 'end_must_be_after_start' });
  });

  it('trims title and stores null when empty', () => {
    const result = validateMakeClipForm({
      durationSeconds: 1800,
      endSeconds: null,
      startSeconds: 12.9,
      title: '   ',
      visibility: SharableStatusEnum.Unlisted,
    });

    expect(result).toEqual({
      ok: true,
      value: {
        endSeconds: null,
        startSeconds: 12,
        title: null,
        visibility: SharableStatusEnum.Unlisted,
      },
    });
  });

  it('clamps end to media duration', () => {
    const result = validateMakeClipForm({
      durationSeconds: 90,
      endSeconds: 132,
      startSeconds: 20,
      title: 'Example clip',
      visibility: SharableStatusEnum.Public,
    });

    expect(result).toEqual({
      ok: true,
      value: {
        endSeconds: 90,
        startSeconds: 20,
        title: 'Example clip',
        visibility: SharableStatusEnum.Public,
      },
    });
  });
});
