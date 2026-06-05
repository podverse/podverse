/**
 * Normalize optional env strings: undefined, empty, or whitespace-only → undefined; otherwise trim.
 */
export function optionalEnvString(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}
