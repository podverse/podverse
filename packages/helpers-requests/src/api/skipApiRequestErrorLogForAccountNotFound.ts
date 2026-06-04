import { isAccountByIdTextApiPath } from './apiRequestPath.js';

const getResponseMessage = (responseData: unknown): string | undefined => {
  if (responseData !== null && typeof responseData === 'object') {
    const message = Reflect.get(responseData, 'message');
    if (typeof message === 'string') {
      return message;
    }
  }

  return undefined;
};

/**
 * Public profile SSR resolves accounts by id_text. Missing or non-visible accounts return HTTP 404
 * with message "Account not found"; that is an expected client outcome, not an API error to log.
 */
export function skipApiRequestErrorLogForAccountNotFound(
  errorInfo: { status?: number; responseData?: unknown },
  requestPath: string
): boolean {
  if (errorInfo.status !== 404 || !isAccountByIdTextApiPath(requestPath)) {
    return false;
  }

  return getResponseMessage(errorInfo.responseData) === 'Account not found';
}
