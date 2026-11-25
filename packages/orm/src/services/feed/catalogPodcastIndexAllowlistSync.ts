export type CatalogAllowlistOrigin = 'deployment' | 'admin';

export type CatalogAllowlistRowSnapshot = {
  podcastIndexId: number;
  origin: CatalogAllowlistOrigin;
};

export type DeploymentAllowlistSyncPlan = {
  insertIds: number[];
  deleteIds: number[];
};

/**
 * Deployment rows mirror the env list. Admin rows stay, including when the same id is also
 * deployed. A deployment row whose id left the env list is removed. Feed rows are not part of
 * this plan.
 */
export function planDeploymentAllowlistSync(
  rows: readonly CatalogAllowlistRowSnapshot[],
  envIds: readonly number[]
): DeploymentAllowlistSyncPlan {
  const env = new Set(envIds);
  const present = new Set(rows.map((row) => row.podcastIndexId));
  const insertIds: number[] = [];
  for (const id of env) {
    if (!present.has(id)) {
      insertIds.push(id);
    }
  }
  const deleteIds: number[] = [];
  for (const row of rows) {
    if (row.origin === 'deployment' && !env.has(row.podcastIndexId)) {
      deleteIds.push(row.podcastIndexId);
    }
  }
  return { insertIds, deleteIds };
}
