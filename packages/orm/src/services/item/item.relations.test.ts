import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const itemServicePath = fileURLToPath(new URL('./item.ts', import.meta.url));

describe('ItemService relation mapping source guard', () => {
  const src = readFileSync(itemServicePath, 'utf8');

  it('maps requested channel relation in getItemOneToOneRelations', () => {
    expect(src).toContain('const channelRelation = relations.channel;');
    expect(src).toContain('...(channelRelation ? { channel: channelRelation } : {}),');
  });

  it('forwards the requested live_item relation shape instead of collapsing it to true', () => {
    expect(src).toContain('const liveItemRelation = relations.live_item;');
    expect(src).toContain('...(liveItemRelation ? { live_item: liveItemRelation } : {}),');
  });

  it('requests the nested live item status for single-item reads', () => {
    expect(src).toContain('live_item: { live_item_status: true },');
  });
});
