/**
 * Terms acceptance denials return HTTP 403 with `code: terms_acceptance_required`.
 * Those responses are the normal gate while the agreement screen is up and should not
 * be logged as API errors.
 */
export function skipApiRequestErrorLogForTermsAcceptance(errorInfo: {
  status?: number;
  responseData?: unknown;
}): boolean {
  if (errorInfo.status !== 403) {
    return false;
  }
  const data = errorInfo.responseData;
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  const code = Reflect.get(data, 'code');
  return code === 'terms_acceptance_required';
}
