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
});
