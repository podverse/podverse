import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const baseUrl = fileURLToPath(new URL('./baseStatsTrackEvent.ts', import.meta.url));

describe('baseStatsTrackEvent SQL identifier safety', () => {
  const src = readFileSync(baseUrl, 'utf8');

  it('does not run raw SQL via EntityManager.query', () => {
    expect(src).not.toMatch(/\breadWriteEntityManager\.query\b/);
  });

  it('does not interpolate dynamic table names from instance fields', () => {
    expect(src).not.toMatch(/\$\{\s*this\.entityName\s*\}/);
    expect(src).not.toMatch(/\$\{\s*this\.entityIdField\s*\}/);
  });

  it('derives grouped column alias from entity metadata', () => {
    expect(src).toContain('targetEntityIdColumnPropertyPath');
    expect(src).toContain('findColumnWithPropertyPath');
  });
});
