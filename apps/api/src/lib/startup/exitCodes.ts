type ExitFn = (code: number) => never;

/**
 * sysexits `EX_CONFIG`: startup configuration is missing or invalid. Alerting matches on this
 * code to tell a misconfigured process from one that failed at runtime, so nothing else may
 * exit 78.
 */
export const EXIT_CODE_CONFIG_INVALID = 78;

/** A startup config check failed. The process exits with `EXIT_CODE_CONFIG_INVALID`. */
export class StartupConfigInvalidError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'StartupConfigInvalidError';
  }
}

/** Runs a config check and rethrows its failure as `StartupConfigInvalidError`. */
export function assertStartupConfig(check: () => void): void {
  try {
    check();
  } catch (error) {
    if (error instanceof StartupConfigInvalidError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new StartupConfigInvalidError(message, { cause: error });
  }
}

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
