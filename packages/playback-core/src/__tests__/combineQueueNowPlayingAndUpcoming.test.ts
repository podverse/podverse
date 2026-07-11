import { describe, expect, it } from 'vitest';

import type { DTOQueueResource } from '@podverse/helpers';

import { combineQueueNowPlayingAndUpcoming } from '../combineQueueNowPlayingAndUpcoming.js';

const resource = (id: number): DTOQueueResource =>
  ({
    id,
    id_text: `qr-${id}`,
  }) as unknown as DTOQueueResource;

describe('combineQueueNowPlayingAndUpcoming', () => {
  it('places now playing first, then upcoming', () => {
    const np = resource(1);
    const up = [resource(2), resource(3)];
    const combined = combineQueueNowPlayingAndUpcoming(np, up);
    expect(combined).toEqual([np, ...up]);
    expect(combined[0]).toBe(np);
  });

  it('uses only upcoming when now playing is null', () => {
    const up = [resource(10), resource(11)];
    const combined = combineQueueNowPlayingAndUpcoming(null, up);
    expect(combined).toEqual(up);
    expect(combined[0]).toBe(up[0]);
  });

  it('returns empty when both are empty', () => {
    expect(combineQueueNowPlayingAndUpcoming(null, [])).toEqual([]);
  });
});
