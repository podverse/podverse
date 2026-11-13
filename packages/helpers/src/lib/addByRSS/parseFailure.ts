import type {
  AddByRSSParseAuthChallenge,
  AddByRSSParseCredentialsState,
  AddByRSSParseFailureReason,
} from '../addByRSSParseCache.js';

const BASIC_CHALLENGE = /(^|,)\s*basic\b/i;

/** Reads a `WWW-Authenticate` value as the challenge kind the device acts on. */
export const toAddByRSSAuthChallenge = (
  wwwAuthenticate: string | null | undefined
): AddByRSSParseAuthChallenge => {
  if (wwwAuthenticate === null || wwwAuthenticate === undefined || wwwAuthenticate.trim() === '') {
    return 'none';
  }
  return BASIC_CHALLENGE.test(wwwAuthenticate) ? 'basic' : 'other';
};

export type AddByRSSFetchFailureSignal = {
  authChallenge: AddByRSSParseAuthChallenge;
  credentialsState: AddByRSSParseCredentialsState;
  /** The feed host's status when it answered with a failure. */
  httpStatus?: number;
  /** The request never got an answer: DNS, connection, TLS, timeout, or too many redirects. */
  transportError: boolean;
};

/**
 * The failure reason a device can act on, from the fetch's status, challenge, and credential
 * state.
 *
 * - An unopenable envelope always reports `credentials_envelope_invalid`.
 * - 401/403 after sending credentials means the origin rejected them.
 * - When credentials existed but scope withheld them, any failure keeps the withheld reason:
 *   the device needs to know its credentials never reached the origin.
 * - A 401 without a non-Basic challenge, with nothing sent, means credentials are required.
 */
export const resolveAddByRSSParseFailureReason = ({
  authChallenge,
  credentialsState,
  httpStatus,
  transportError,
}: AddByRSSFetchFailureSignal): AddByRSSParseFailureReason => {
  if (credentialsState === 'decrypt_failed') {
    return 'credentials_envelope_invalid';
  }
  if (credentialsState === 'sent' && (httpStatus === 401 || httpStatus === 403)) {
    return 'credentials_rejected';
  }
  if (credentialsState === 'withheld_other_domain') {
    return 'credentials_withheld_other_domain';
  }
  if (credentialsState === 'withheld_insecure') {
    return 'credentials_withheld_insecure';
  }
  if (httpStatus === 401 && authChallenge !== 'other') {
    return 'credentials_required';
  }
  if (httpStatus !== undefined) {
    return 'http_error';
  }
  if (transportError) {
    return 'network';
  }
  return 'parse';
};
