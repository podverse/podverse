import { LONG_RUNNING_COMMANDS } from './extensions/longRunningCommands.js';

type ExitFn = (code: number) => never;

/**
 * Ends a one-shot worker process with the accumulated exit code.
 * Long-running Deployment commands stay alive and do not auto-exit here.
 */
export function finalizeOneShotWorkerProcess(
  commandName: string,
  exitCode: number,
  exitFn: ExitFn = process.exit
): void {
  if (LONG_RUNNING_COMMANDS.has(commandName)) {
    return;
  }

  exitFn(exitCode);
}
