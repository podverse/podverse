import { getOwnPropertyValue, isObjectLike, toNonEmptyTrimmedString } from '../guards.js';

export const getErrorResponseStatus = (error: unknown): number | undefined => {
  const response = getOwnPropertyValue(error, 'response');
  const status = getOwnPropertyValue(response, 'status');
  return typeof status === 'number' ? status : undefined;
};

export const getErrorResponseBody = (error: unknown): Record<string, unknown> | undefined => {
  const response = getOwnPropertyValue(error, 'response');
  const data = getOwnPropertyValue(response, 'data');
  return isObjectLike(data) ? data : undefined;
};

export const getErrorResponseBodyMessage = (error: unknown): string | undefined => {
  const responseBody = getErrorResponseBody(error);
  if (responseBody === undefined) {
    return undefined;
  }
  const message = toNonEmptyTrimmedString(responseBody.message);
  return message ?? undefined;
};

/** When response.data is JSON with a string `code` (e.g. MetaBoost `sender_blocked`). */
export const getErrorResponseBodyCode = (error: unknown): string | undefined => {
  const responseBody = getErrorResponseBody(error);
  if (responseBody === undefined) {
    return undefined;
  }
  const code = getOwnPropertyValue(responseBody, 'code');
  return typeof code === 'string' ? code : undefined;
};

export const getErrorCode = (error: unknown): string | undefined => {
  const code = getOwnPropertyValue(error, 'code');
  return typeof code === 'string' ? code : undefined;
};

/**
 * Extract a user-facing message from common error shapes:
 * Error.message, response.data (message/reason/detail), data.message/reason/error,
 * top-level message/reason.
 */
export const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error) {
    const normalizedMessage = toNonEmptyTrimmedString(error.message);
    if (normalizedMessage !== null) {
      return normalizedMessage;
    }
  }

  const response = getOwnPropertyValue(error, 'response');
  const responseData = getOwnPropertyValue(response, 'data');
  if (isObjectLike(responseData)) {
    const responseMessage =
      toNonEmptyTrimmedString(responseData.message) ??
      toNonEmptyTrimmedString(responseData.reason) ??
      toNonEmptyTrimmedString(responseData.detail);
    if (responseMessage !== null) {
      return responseMessage;
    }
  }

  const data = getOwnPropertyValue(error, 'data');
  if (isObjectLike(data)) {
    const dataMessage =
      toNonEmptyTrimmedString(data.message) ??
      toNonEmptyTrimmedString(data.reason) ??
      toNonEmptyTrimmedString(data.error);
    if (dataMessage !== null) {
      return dataMessage;
    }
  }

  const topLevelMessage = toNonEmptyTrimmedString(getOwnPropertyValue(error, 'message'));
  if (topLevelMessage !== null) {
    return topLevelMessage;
  }

  const topLevelReason = toNonEmptyTrimmedString(getOwnPropertyValue(error, 'reason'));
  if (topLevelReason !== null) {
    return topLevelReason;
  }

  return fallback;
};
