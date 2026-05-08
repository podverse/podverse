/**
 * Gates management list/tool chrome until the main request finishes and any
 * existence probe settles (filtered-empty → unscoped probe pattern).
 *
 * Use {@link bypassWhileError} so API errors render alerts immediately without
 * waiting for a probe.
 */
export type ManagementProbeChromePhase = 'content' | 'spinner';

export type ResolveManagementProbeChromePhaseArgs = {
  loading: boolean;
  probingExistence: boolean;
  /** When true, show full chrome immediately (e.g. error alerts). */
  bypassWhileError: boolean;
};

export function resolveManagementProbeChromePhase(
  args: ResolveManagementProbeChromePhaseArgs
): ManagementProbeChromePhase {
  if (args.loading) {
    return 'spinner';
  }
  if (args.bypassWhileError) {
    return 'content';
  }
  if (args.probingExistence) {
    return 'spinner';
  }
  return 'content';
}
