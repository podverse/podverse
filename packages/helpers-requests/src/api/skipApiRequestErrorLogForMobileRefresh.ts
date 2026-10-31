/**
 * A 401 from the mobile refresh route is the session-end path. The client clears the session
 * that sent the token, or ignores the refusal when that session has already ended. Either way
 * the response is expected, and logging it opens the dev error overlay over the app.
 */
export function skipApiRequestErrorLogForMobileRefresh(
  errorInfo: { status?: number },
  requestPath: string
): boolean {
  return errorInfo.status === 401 && requestPath === '/auth/mobile/refresh';
}
