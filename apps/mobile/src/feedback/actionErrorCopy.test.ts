import { describe, expect, it } from 'vitest';

import type { PlaybackErrorKind } from '../../modules/podverse-media-engine';
import {
  actionErrorDetailLine,
  downloadErrorMessageKeys,
  playbackErrorFromLoadFailure,
  playbackErrorMessageKeys,
} from './actionErrorCopy';

const PLAYBACK_KINDS: PlaybackErrorKind[] = [
  'audio-session',
  'decode',
  'file-not-found',
  'host-http',
  'invalid-source',
  'network',
  'unknown',
  'unsupported',
];

describe('playbackErrorMessageKeys', () => {
  it('gives every kind its own body, a shared title, and retry', () => {
    const bodies = PLAYBACK_KINDS.map((kind) => playbackErrorMessageKeys(kind).bodyKey);
    expect(new Set(bodies).size).toBe(PLAYBACK_KINDS.length);

    for (const kind of PLAYBACK_KINDS) {
      const keys = playbackErrorMessageKeys(kind);
      expect(keys.titleKey).toBe('action_error.playback_title');
      expect(keys.confirmLabelKey).toBe('misc.try_again');
      expect(keys.bodyKey.startsWith('action_error.playback_')).toBe(true);
    }
  });
});

describe('downloadErrorMessageKeys', () => {
  it('maps each stored reason and falls back when the reason is missing or unknown', () => {
    expect(downloadErrorMessageKeys('no_storage').bodyKey).toBe('action_error.download_no_storage');
    expect(downloadErrorMessageKeys('transfer_failed').bodyKey).toBe(
      'action_error.download_transfer_failed'
    );
    expect(downloadErrorMessageKeys('file_missing').bodyKey).toBe(
      'action_error.download_file_missing'
    );
    expect(downloadErrorMessageKeys(null).bodyKey).toBe('action_error.download_unknown');
    expect(downloadErrorMessageKeys('something_else').bodyKey).toBe(
      'action_error.download_unknown'
    );

    for (const reason of ['no_storage', 'transfer_failed', 'file_missing', null, ''] as const) {
      const keys = downloadErrorMessageKeys(reason);
      expect(keys.titleKey).toBe('action_error.download_title');
      expect(keys.confirmLabelKey).toBe('misc.try_again');
    }
  });
});

describe('actionErrorDetailLine', () => {
  it('joins the reason, code, and message and drops blank parts', () => {
    expect(
      actionErrorDetailLine({
        code: 'ERROR_CODE_IO_NETWORK_CONNECTION_FAILED',
        message: 'timeout',
        reason: 'network',
      })
    ).toBe('network · ERROR_CODE_IO_NETWORK_CONNECTION_FAILED · timeout');
    expect(actionErrorDetailLine({ code: '  ', message: '', reason: 'unknown' })).toBe('unknown');
    expect(actionErrorDetailLine({ code: '', message: '', reason: '' })).toBe('');
  });

  it('names the host HTTP status right after the reason', () => {
    expect(
      actionErrorDetailLine({
        code: 'item_failed',
        httpStatus: 404,
        message: '',
        reason: 'host-http',
      })
    ).toBe('host-http · HTTP 404 · item_failed');
  });
});

describe('playbackErrorFromLoadFailure', () => {
  it('is an unknown event with no native code or message', () => {
    expect(playbackErrorFromLoadFailure()).toEqual({
      code: '',
      kind: 'unknown',
      message: '',
    });
  });

  it('keeps the code and message a rejected native call carried', () => {
    const rejection = Object.assign(new Error('Source unreachable'), { code: 'ERR_LOAD' });
    expect(playbackErrorFromLoadFailure(rejection)).toEqual({
      code: 'ERR_LOAD',
      kind: 'unknown',
      message: 'Source unreachable',
    });
  });
});
