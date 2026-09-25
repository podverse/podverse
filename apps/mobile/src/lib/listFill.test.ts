import { describe, expect, it } from 'vitest';

import { resolveListFill } from './listFill';

describe('resolveListFill', () => {
  it('is loading while the current view is unsettled, even with zero rows', () => {
    expect(resolveListFill({ isSettled: false, errorKey: null, rowCount: 0 })).toBe('loading');
  });

  it('is loading while unsettled even when an error key is already set', () => {
    expect(resolveListFill({ isSettled: false, errorKey: 'errors.generic', rowCount: 0 })).toBe(
      'loading'
    );
  });

  it('is empty only when settled, error-free, and count is zero', () => {
    expect(resolveListFill({ isSettled: true, errorKey: null, rowCount: 0 })).toBe('empty');
  });

  it('is error when settled with an error key and no rows', () => {
    expect(resolveListFill({ isSettled: true, errorKey: 'errors.generic', rowCount: 0 })).toBe(
      'error'
    );
  });

  it('is ready when settled with rows, even if an earlier error key remains', () => {
    expect(resolveListFill({ isSettled: true, errorKey: 'errors.generic', rowCount: 3 })).toBe(
      'ready'
    );
  });

  it('is ready when settled with rows and no error', () => {
    expect(resolveListFill({ isSettled: true, errorKey: null, rowCount: 1 })).toBe('ready');
  });
});
