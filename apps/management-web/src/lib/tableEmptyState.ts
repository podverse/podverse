import type { TableWithFilterEmptyState } from '@podverse/ui';

export type ManagementTableEmptyResolutionArgs = {
  /** When false, the dataset has no rows at all (unfiltered probe). When true, at least one row exists. When undefined, probe not finished — returns undefined. */
  hasDataInSystem: boolean | undefined;
  filteredEmptyMessage: string;
  /** Current rows visible after client/server filters. */
  hasVisibleRows: boolean;
  systemEmptyMessage: string;
};

/**
 * Builds {@link TableWithFilterEmptyState} for management list pages:
 * - **system-empty**: no rows exist in the system for this resource → hide table tools via `mode`.
 * - **filtered-empty**: rows exist but none match current filters/search.
 */
export function resolveManagementTableEmptyState(
  args: ManagementTableEmptyResolutionArgs
): TableWithFilterEmptyState | undefined {
  if (args.hasVisibleRows) {
    return undefined;
  }
  if (args.hasDataInSystem === undefined) {
    return undefined;
  }
  if (!args.hasDataInSystem) {
    return {
      hideTools: true,
      message: args.systemEmptyMessage,
      mode: 'system-empty',
    };
  }
  return {
    message: args.filteredEmptyMessage,
    mode: 'filtered-empty',
  };
}
