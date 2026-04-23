/**
 * List of known worker command names. Used for command-first bootstrap so we can
 * resolve the command from argv and run per-job validation before loading config or commands.
 * Do not import config or command implementations here. Canonical list lives in
 * @podverse/worker-commands.
 */
export { KNOWN_COMMANDS, type KnownCommandName } from '@podverse/worker-commands';
