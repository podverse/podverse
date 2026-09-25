import type {
  AddByRSSParseAuthChallenge,
  AddByRSSParseCredentialsState,
  AddByRSSParseFailureReason,
} from '@podverse/helpers';

export type UpstreamHttpFailure = {
  httpStatus?: number;
  authChallenge: AddByRSSParseAuthChallenge;
};

export type ClassifiedAddByRSSParseFailure = UpstreamHttpFailure & {
  failureReason: AddByRSSParseFailureReason;
};

const BASIC_CHALLENGE = /(^|,)\s*basic\b/i;

const readHeader = (headers: unknown, nameLower: string): string | undefined => {
  if (typeof headers !== 'object' || headers === null) {
    return undefined;
  }
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() !== nameLower) {
      continue;
    }
    if (typeof value === 'string') {
      return value;
    }
    if (Array.isArray(value)) {
      return value.filter((part): part is string => typeof part === 'string').join(', ');
    }
  }
  return undefined;
};

export const toAuthChallenge = (
  wwwAuthenticate: string | undefined
): AddByRSSParseAuthChallenge => {
  if (wwwAuthenticate === undefined || wwwAuthenticate.trim() === '') {
    return 'none';
  }
  return BASIC_CHALLENGE.test(wwwAuthenticate) ? 'basic' : 'other';
};

/**
 * Reads the HTTP status and auth challenge from an Axios-style error. Only the status and the
 * `WWW-Authenticate` header are read — never the request config, which holds the Authorization
 * header, and never the response body.
 */
export const readUpstreamHttpFailure = (error: unknown): UpstreamHttpFailure => {
  if (typeof error !== 'object' || error === null || !('response' in error)) {
    return { authChallenge: 'none' };
  }
  const response = error.response;
  if (typeof response !== 'object' || response === null) {
    return { authChallenge: 'none' };
  }
  const httpStatus =
    'status' in response && typeof response.status === 'number' ? response.status : undefined;
  const headers = 'headers' in response ? response.headers : undefined;
  return { httpStatus, authChallenge: toAuthChallenge(readHeader(headers, 'www-authenticate')) };
};

/** Axios and Node socket errors carry `isAxiosError` or a string `code`; parser throws do not. */
const isTransportError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (('isAxiosError' in error && error.isAxiosError === true) ||
    ('code' in error && typeof error.code === 'string'));

/**
 * Maps a failed add-by-RSS fetch to a reason the device can act on. `error` is the thrown fetch
 * error; omit it when the fetch succeeded but the body did not parse.
 *
 * - An unopenable envelope always reports `credentials_envelope_invalid`.
 * - 401/403 after sending credentials means the origin rejected them.
 * - When credentials existed but scope withheld them, any failure keeps the withheld reason:
 *   the device needs to know its credentials never reached the origin.
 * - A 401 without a non-Basic challenge, with nothing sent, means credentials are required.
 */
export const classifyAddByRSSParseFailure = ({
  error,
  credentialsState,
}: {
  error?: unknown;
  credentialsState: AddByRSSParseCredentialsState;
}): ClassifiedAddByRSSParseFailure => {
  const upstream: UpstreamHttpFailure =
    error === undefined ? { authChallenge: 'none' } : readUpstreamHttpFailure(error);
  const { httpStatus } = upstream;
  const classified = (failureReason: AddByRSSParseFailureReason) => ({
    ...upstream,
    failureReason,
  });

  if (credentialsState === 'decrypt_failed') {
    return classified('credentials_envelope_invalid');
  }
  if (credentialsState === 'sent' && (httpStatus === 401 || httpStatus === 403)) {
    return classified('credentials_rejected');
  }
  if (credentialsState === 'withheld_other_domain') {
    return classified('credentials_withheld_other_domain');
  }
  if (credentialsState === 'withheld_insecure') {
    return classified('credentials_withheld_insecure');
  }
  if (httpStatus === 401 && upstream.authChallenge !== 'other') {
    return classified('credentials_required');
  }
  if (httpStatus !== undefined) {
    return classified('http_error');
  }
  if (error !== undefined && isTransportError(error)) {
    return classified('network');
  }
  return classified('parse');
};

/**
 * Next value for the follow row's `requires_credentials`, or undefined to leave it alone.
 * A success without credentials proves the feed is public; a 401 or a rejection proves it is not.
 * A success with credentials proves nothing, since the feed may accept anonymous requests too.
 */
export const nextRequiresCredentials = (
  outcome:
    | { status: 'succeeded'; credentialsState: AddByRSSParseCredentialsState }
    | { status: 'failed'; failureReason: AddByRSSParseFailureReason }
): boolean | undefined => {
  if (outcome.status === 'succeeded') {
    return outcome.credentialsState === 'sent' ? undefined : false;
  }
  if (
    outcome.failureReason === 'credentials_required' ||
    outcome.failureReason === 'credentials_rejected'
  ) {
    return true;
  }
  return undefined;
};
