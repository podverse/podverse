import { renameSync, writeFileSync } from 'node:fs';

/**
 * Replaces the in-flight file in one rename so a liveness probe never reads half a value.
 * Contents are the handler's start time in epoch seconds, or empty while no handler runs.
 */
export const writeInFlightFile = (path: string, startedAtMs: number | null): void => {
  const contents = startedAtMs === null ? '' : String(Math.floor(startedAtMs / 1000));
  const tmpPath = `${path}.tmp`;
  writeFileSync(tmpPath, contents);
  renameSync(tmpPath, path);
};
