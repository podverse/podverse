import type { PlaybackErrorEvent, PlaybackErrorKind } from '../../modules/podverse-media-engine';

/**
 * Catalog keys for an action-error dialog. Confirm is always retry; the body explains the kind.
 */
export type ActionErrorMessageKeys = {
  bodyKey: string;
  confirmLabelKey: 'misc.try_again';
  titleKey: string;
};

const RETRY_LABEL_KEY = 'misc.try_again' as const;

const playbackTitleKey = 'action_error.playback_title';
const downloadTitleKey = 'action_error.download_title';

/**
 * One title and body per playback kind. Exhaustive so a new kind cannot ship without copy.
 */
export const playbackErrorMessageKeys = (kind: PlaybackErrorKind): ActionErrorMessageKeys => {
  switch (kind) {
    case 'network':
      return {
        bodyKey: 'action_error.playback_network',
        confirmLabelKey: RETRY_LABEL_KEY,
        titleKey: playbackTitleKey,
      };
    case 'unsupported':
      return {
        bodyKey: 'action_error.playback_unsupported',
        confirmLabelKey: RETRY_LABEL_KEY,
        titleKey: playbackTitleKey,
      };
    case 'file-not-found':
      return {
        bodyKey: 'action_error.playback_file_not_found',
        confirmLabelKey: RETRY_LABEL_KEY,
        titleKey: playbackTitleKey,
      };
    case 'decode':
      return {
        bodyKey: 'action_error.playback_decode',
        confirmLabelKey: RETRY_LABEL_KEY,
        titleKey: playbackTitleKey,
      };
    case 'audio-session':
      return {
        bodyKey: 'action_error.playback_audio_session',
        confirmLabelKey: RETRY_LABEL_KEY,
        titleKey: playbackTitleKey,
      };
    case 'invalid-source':
      return {
        bodyKey: 'action_error.playback_invalid_source',
        confirmLabelKey: RETRY_LABEL_KEY,
        titleKey: playbackTitleKey,
      };
    case 'unknown':
      return {
        bodyKey: 'action_error.playback_unknown',
        confirmLabelKey: RETRY_LABEL_KEY,
        titleKey: playbackTitleKey,
      };
  }
};

const DOWNLOAD_ERROR_REASONS = ['file_missing', 'no_storage', 'transfer_failed'] as const;

export type KnownDownloadErrorReason = (typeof DOWNLOAD_ERROR_REASONS)[number];

export type DownloadErrorReasonKey = KnownDownloadErrorReason | 'unknown';

export const downloadErrorReasonKey = (reason: string | null): DownloadErrorReasonKey => {
  switch (reason) {
    case 'file_missing':
    case 'no_storage':
    case 'transfer_failed':
      return reason;
    default:
      return 'unknown';
  }
};

/**
 * One title and body per stored download failure. Unknown and missing reasons share the generic body.
 */
export const downloadErrorMessageKeys = (reason: string | null): ActionErrorMessageKeys => {
  switch (downloadErrorReasonKey(reason)) {
    case 'no_storage':
      return {
        bodyKey: 'action_error.download_no_storage',
        confirmLabelKey: RETRY_LABEL_KEY,
        titleKey: downloadTitleKey,
      };
    case 'transfer_failed':
      return {
        bodyKey: 'action_error.download_transfer_failed',
        confirmLabelKey: RETRY_LABEL_KEY,
        titleKey: downloadTitleKey,
      };
    case 'file_missing':
      return {
        bodyKey: 'action_error.download_file_missing',
        confirmLabelKey: RETRY_LABEL_KEY,
        titleKey: downloadTitleKey,
      };
    case 'unknown':
      return {
        bodyKey: 'action_error.download_unknown',
        confirmLabelKey: RETRY_LABEL_KEY,
        titleKey: downloadTitleKey,
      };
  }
};

/**
 * Machine detail a user can screenshot for the host or for support. Empty parts are omitted.
 */
export const actionErrorDetailLine = (parts: {
  code: string;
  message: string;
  reason: string;
}): string => {
  return [parts.reason, parts.code, parts.message]
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join(' · ');
};

/** Load and retry failures that never received a native error payload. */
export const playbackErrorFromLoadFailure = (): PlaybackErrorEvent => ({
  code: '',
  kind: 'unknown',
  message: '',
});
