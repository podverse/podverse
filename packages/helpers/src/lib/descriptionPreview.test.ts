import { describe, expect, it } from 'vitest';

import { readDescriptionDocument } from './descriptionDocument.js';
import { buildArchivedDescriptionValue } from './descriptionPreview.js';

describe('buildArchivedDescriptionValue', () => {
  it('returns an empty string for an empty preview', () => {
    expect(buildArchivedDescriptionValue('')).toBe('');
  });

  it('wraps the escaped preview in a paragraph that strict parsing accepts', () => {
    const preview = `Tom & Jerry <3 "quotes" and 'apostrophes'`;
    const value = buildArchivedDescriptionValue(preview);

    expect(value).toBe('Tom & Jerry \\<3 "quotes" and \'apostrophes\'');
    expect(readDescriptionDocument(value).rich).toEqual([
      { kind: 'p', children: [{ kind: 'text', text: preview }] },
    ]);
  });
});
