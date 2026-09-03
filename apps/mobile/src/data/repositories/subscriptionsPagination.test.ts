import { describe, expect, it } from 'vitest';

import { getNextDirectoryPage } from './subscriptionsPagination';

const progress = (
  overrides: Partial<Parameters<typeof getNextDirectoryPage>[0]> = {}
): Parameters<typeof getNextDirectoryPage>[0] => ({
  itemCount: 60,
  limit: 60,
  requestedPage: 1,
  responsePage: 1,
  totalCount: 121,
  ...overrides,
});

describe('getNextDirectoryPage', () => {
  it('walks every known page', () => {
    expect(getNextDirectoryPage(progress())).toBe(2);
    expect(
      getNextDirectoryPage(progress({ requestedPage: 2, responsePage: 2, itemCount: 60 }))
    ).toBe(3);
    expect(
      getNextDirectoryPage(
        progress({ requestedPage: 3, responsePage: 3, itemCount: 1, totalCount: 121 })
      )
    ).toBeNull();
  });

  it('does not stop at the former page-ceiling boundary', () => {
    expect(
      getNextDirectoryPage({
        itemCount: 60,
        limit: 60,
        requestedPage: 25,
        responsePage: 25,
        totalCount: 1_561,
      })
    ).toBe(26);
  });

  it('continues unknown-count pages until a short page', () => {
    expect(getNextDirectoryPage(progress({ totalCount: null }))).toBe(2);
    expect(getNextDirectoryPage(progress({ itemCount: 12, totalCount: null }))).toBeNull();
  });

  it('rejects non-advancing or malformed pagination metadata', () => {
    expect(() => getNextDirectoryPage(progress({ requestedPage: 2, responsePage: 1 }))).toThrow(
      'Invalid directory subscription pagination metadata'
    );
    expect(() => getNextDirectoryPage(progress({ limit: 0 }))).toThrow(
      'Invalid directory subscription pagination metadata'
    );
    expect(() => getNextDirectoryPage(progress({ totalCount: -1 }))).toThrow(
      'Invalid directory subscription pagination metadata'
    );
  });
});
