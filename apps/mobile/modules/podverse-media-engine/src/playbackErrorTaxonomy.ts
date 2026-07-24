/**
 * Playback error taxonomy (step 2.27 / detail 106).
 *
 * Native engines emit platform-specific `code` strings: iOS custom codes (`invalid_url`,
 * `item_failed`, `file_not_found`, `audio_session*`) and Android Media3 `errorCodeName` values
 * (`ERROR_CODE_IO_NETWORK_CONNECTION_FAILED`, `ERROR_CODE_IO_FILE_NOT_FOUND`,
 * `ERROR_CODE_DECODING_FAILED`, …). This pure module maps those to a small, stable
 * {@link PlaybackErrorKind} so RN shows an i18n message keyed off the `kind` instead of raw native
 * text. Kept free of native/`expo` imports so Vitest can cover the table without a device (2.28).
 */
import type { NativePlaybackErrorPayload, PlaybackErrorEvent, PlaybackErrorKind } from './types';

/** Exact iOS custom codes → kind. Android codes are matched by keyword below. */
const IOS_CODE_KIND: Record<string, PlaybackErrorKind> = {
  audio_session: 'audio-session',
  audio_session_activate: 'audio-session',
  file_not_found: 'file-not-found',
  invalid_url: 'invalid-source',
};

/**
 * Map a native error `code` to a stable {@link PlaybackErrorKind}. Unknown codes fall back to
 * `'unknown'` (the caller still keeps the original `code`/`message` for logs). Deterministic and
 * side-effect free.
 */
export function mapPlaybackErrorKind(code: string): PlaybackErrorKind {
  const normalized = code.trim();

  const iosKind = IOS_CODE_KIND[normalized];
  if (iosKind !== undefined) {
    return iosKind;
  }

  const upper = normalized.toUpperCase();
  if (upper.includes('FILE_NOT_FOUND')) {
    return 'file-not-found';
  }
  if (upper.includes('NETWORK') || upper.includes('HTTP') || upper.includes('CLEARTEXT')) {
    return 'network';
  }
  if (upper.includes('DECOD')) {
    return 'decode';
  }
  if (upper.includes('UNSUPPORTED') || upper.includes('PARSING')) {
    return 'unsupported';
  }

  return 'unknown';
}

/**
 * Normalize a raw native error payload into a {@link PlaybackErrorEvent} by attaching `kind`. The
 * raw `code` and `message` are preserved so logs keep the native detail even for `'unknown'`.
 */
export function normalizePlaybackError(payload: NativePlaybackErrorPayload): PlaybackErrorEvent {
  return {
    code: payload.code,
    kind: mapPlaybackErrorKind(payload.code),
    message: payload.message,
  };
}
