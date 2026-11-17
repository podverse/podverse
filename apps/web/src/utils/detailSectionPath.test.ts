import { describe, expect, it } from 'vitest';

import { detailSectionPath } from './detailSectionPath';

describe('detailSectionPath', () => {
  it('sets type for a section that is not the default and keeps the other params', () => {
    expect(
      detailSectionPath('/podcast/e2eRmtItmCh01', 'sort=oldest', 'remote-items', 'episodes')
    ).toBe('/podcast/e2eRmtItmCh01?sort=oldest&type=remote-items');
  });

  it('removes type when the section is the default and drops a query that is then empty', () => {
    expect(
      detailSectionPath('/podcast/e2eRmtItmCh01', '?type=podroll', 'episodes', 'episodes')
    ).toBe('/podcast/e2eRmtItmCh01');
  });

  it('sets type on an album path', () => {
    expect(detailSectionPath('/album/e2eRmtItmAl01', '', 'remote-items', 'tracks')).toBe(
      '/album/e2eRmtItmAl01?type=remote-items'
    );
  });
});
