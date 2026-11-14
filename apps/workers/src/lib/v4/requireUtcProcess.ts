/**
 * Throws unless the process is UTC in winter and in summer.
 * A zone that is UTC only in winter still shifts a summer timestamp.
 */
export function requireUtcProcess(commandName: string): void {
  const winterOffset = new Date(0).getTimezoneOffset();
  const summerOffset = new Date(Date.UTC(2026, 6, 1)).getTimezoneOffset();
  if (winterOffset !== 0 || summerOffset !== 0) {
    throw new Error(`${commandName} must run with TZ=UTC.`);
  }
}
