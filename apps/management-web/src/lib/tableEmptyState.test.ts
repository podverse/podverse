import { describe, expect, it } from 'vitest';

import { resolveManagementTableEmptyState } from './tableEmptyState';

describe('resolveManagementTableEmptyState', () => {
  it('returns undefined when there are visible rows', () => {
    expect(
      resolveManagementTableEmptyState({
        filteredEmptyMessage: 'filtered',
        hasDataInSystem: true,
        hasVisibleRows: true,
        systemEmptyMessage: 'system',
      })
    ).toBeUndefined();
  });

  it('returns system-empty when nothing exists in the system', () => {
    const result = resolveManagementTableEmptyState({
      filteredEmptyMessage: 'filtered',
      hasDataInSystem: false,
      hasVisibleRows: false,
      systemEmptyMessage: 'No system data',
    });
    expect(result?.mode).toBe('system-empty');
    expect(result?.hideTools).toBe(true);
    expect(result?.message).toBe('No system data');
  });

  it('returns filtered-empty when the system has rows but none match', () => {
    const result = resolveManagementTableEmptyState({
      filteredEmptyMessage: 'No matches',
      hasDataInSystem: true,
      hasVisibleRows: false,
      systemEmptyMessage: 'system',
    });
    expect(result?.mode).toBe('filtered-empty');
    expect(result?.message).toBe('No matches');
  });

  it('returns undefined while system existence is still unknown', () => {
    expect(
      resolveManagementTableEmptyState({
        filteredEmptyMessage: 'filtered',
        hasDataInSystem: undefined,
        hasVisibleRows: false,
        systemEmptyMessage: 'system',
      })
    ).toBeUndefined();
  });
});
