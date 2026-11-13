import type {
  AddByRSSParseAuthChallenge,
  AddByRSSParseCredentialsState,
  AddByRSSParseFailureReason,
} from '@podverse/helpers';
import { resolveAddByRSSParseFailureReason, toAddByRSSAuthChallenge } from '@podverse/helpers';

export type UpstreamHttpFailure = {
  httpStatus?: number;
  authChallenge: AddByRSSParseAuthChallenge;
};

export type ClassifiedAddByRSSParseFailure = UpstreamHttpFailure & {
  failureReason: AddByRSSParseFailureReason;
};

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
  return {
    httpStatus,
    authChallenge: toAddByRSSAuthChallenge(readHeader(headers, 'www-authenticate')),
  };
};

/** Axios and Node socket errors carry `isAxiosError` or a string `code`; parser throws do not. */
const isTransportError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (('isAxiosError' in error && error.isAxiosError === true) ||
    ('code' in error && typeof error.code === 'string'));

/**
 * Maps a thrown fetch error (axios) to the shared failure reason; omit `error` when the fetch
 * succeeded but the body did not parse.
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
  return {
    ...upstream,
    failureReason: resolveAddByRSSParseFailureReason({
      authChallenge: upstream.authChallenge,
      credentialsState,
      httpStatus: upstream.httpStatus,
      transportError: error !== undefined && isTransportError(error),
    }),
  };
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
