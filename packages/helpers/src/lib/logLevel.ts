/**
 * Winston-style log level tokens (see LOG_LEVEL). Used to gate verbose stderr / debug-only paths.
 */

/**
 * True when `level` denotes Winston `debug` after trim and ASCII lowercasing.
 */
export function isLogLevelDebug(level: string | undefined | null): boolean {
  return typeof level === 'string' && level.trim().toLowerCase() === 'debug';
}

/**
 * Reads `process.env.LOG_LEVEL` (Node). Prefer {@link isLogLevelDebug} when using config-derived level.
 */
export function isEnvLogLevelDebug(): boolean {
  return isLogLevelDebug(process.env.LOG_LEVEL);
}
