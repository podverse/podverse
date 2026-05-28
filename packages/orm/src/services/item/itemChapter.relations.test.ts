import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const itemChapterServicePath = fileURLToPath(new URL('./itemChapter.ts', import.meta.url));

describe('ItemChapterService.getByIdText relation defaults', () => {
  const src = readFileSync(itemChapterServicePath, 'utf8');

  it('merges extra relations without dropping the item_chapters_object chain', () => {
    expect(src).toContain('findOptionsRelationsFromPaths<ItemChapter>');
    expect(src).toContain("'item_chapters_object'");
    expect(src).toContain("'item_chapters_object.item_chapters_feed'");
    expect(src).toContain("'item_chapters_object.item_chapters_feed.item'");
    expect(src).toContain('mergeFindOptionsRelations(defaultRelations, extraRelations)');
  });
});
