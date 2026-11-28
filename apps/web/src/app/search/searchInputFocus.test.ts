import { describe, expect, it } from 'vitest';

import { documentOpenedSearchViaBackForward, shouldFocusSearchInput } from './searchInputFocus';

describe('shouldFocusSearchInput', () => {
  const arrival = {
    activationType: null,
    backNavFlag: false,
    documentOpenedSearchViaBackForward: false,
  } as const;

  it('focuses a push, replace, or reload', () => {
    expect(shouldFocusSearchInput({ ...arrival, activationType: 'push' })).toBe(true);
    expect(shouldFocusSearchInput({ ...arrival, activationType: 'replace' })).toBe(true);
    expect(shouldFocusSearchInput({ ...arrival, activationType: 'reload' })).toBe(true);
  });

  it('leaves the field unfocused on a history traversal', () => {
    expect(shouldFocusSearchInput({ ...arrival, activationType: 'traverse' })).toBe(false);
    expect(
      shouldFocusSearchInput({
        ...arrival,
        activationType: 'traverse',
        backNavFlag: false,
        documentOpenedSearchViaBackForward: false,
      })
    ).toBe(false);
  });

  it('leaves the field unfocused when the back flag is set and the browser has no activation type', () => {
    expect(shouldFocusSearchInput({ ...arrival, backNavFlag: true })).toBe(false);
  });

  it('focuses a push even when a stale back flag is still set', () => {
    expect(shouldFocusSearchInput({ ...arrival, activationType: 'push', backNavFlag: true })).toBe(
      true
    );
  });

  it('leaves the field unfocused when the document loaded /search via Back or Forward', () => {
    expect(shouldFocusSearchInput({ ...arrival, documentOpenedSearchViaBackForward: true })).toBe(
      false
    );
  });
});

describe('documentOpenedSearchViaBackForward', () => {
  it('matches a back or forward load of /search', () => {
    expect(documentOpenedSearchViaBackForward('back_forward', 'https://example.com/search')).toBe(
      true
    );
    expect(documentOpenedSearchViaBackForward('back_forward', 'https://example.com/search/')).toBe(
      true
    );
  });

  it('ignores a back or forward load of another page and a normal load of /search', () => {
    expect(documentOpenedSearchViaBackForward('back_forward', 'https://example.com/')).toBe(false);
    expect(documentOpenedSearchViaBackForward('navigate', 'https://example.com/search')).toBe(
      false
    );
    expect(documentOpenedSearchViaBackForward('reload', 'https://example.com/search')).toBe(false);
    expect(documentOpenedSearchViaBackForward('back_forward', null)).toBe(false);
  });
});
