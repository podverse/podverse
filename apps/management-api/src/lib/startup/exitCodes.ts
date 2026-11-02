type ExitFn = (code: number) => never;

/**
 * sysexits `EX_CONFIG`: startup configuration is missing or invalid. Alerting matches on this
 * code to tell a misconfigured job from one that failed at runtime, so nothing else may exit 78.
 */
export const EXIT_CODE_CONFIG_INVALID = 78;

/**
 * Runs env validation and exits `EXIT_CODE_CONFIG_INVALID` when it throws. The validator logs
 * which keys failed before throwing.
 */
export function exitOnStartupConfigInvalid(
  validate: () => void,
  exitFn: ExitFn = process.exit
): void {
  try {
    validate();
  } catch {
    exitFn(EXIT_CODE_CONFIG_INVALID);
  }
}
