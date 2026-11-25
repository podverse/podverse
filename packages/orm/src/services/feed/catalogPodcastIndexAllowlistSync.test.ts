import { describe, expect, it } from 'vitest';

import { planDeploymentAllowlistSync } from './catalogPodcastIndexAllowlistSync.js';

describe('planDeploymentAllowlistSync', () => {
  it('inserts env ids that have no row and deletes deployment rows that left the env list', () => {
    const plan = planDeploymentAllowlistSync(
      [
        { podcastIndexId: 1, origin: 'deployment' },
        { podcastIndexId: 2, origin: 'deployment' },
        { podcastIndexId: 3, origin: 'admin' },
      ],
      [2, 4]
    );

    expect(plan.insertIds).toEqual([4]);
    expect(plan.deleteIds).toEqual([1]);
  });

  it('leaves an admin row in place when the same id is also on the env list', () => {
    const plan = planDeploymentAllowlistSync([{ podcastIndexId: 5, origin: 'admin' }], [5]);

    expect(plan.insertIds).toEqual([]);
    expect(plan.deleteIds).toEqual([]);
  });

  it('does not delete an admin row that is absent from the env list', () => {
    const plan = planDeploymentAllowlistSync([{ podcastIndexId: 8, origin: 'admin' }], []);

    expect(plan).toEqual({ insertIds: [], deleteIds: [] });
  });
});
