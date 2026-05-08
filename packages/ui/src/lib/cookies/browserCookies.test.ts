import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { mergeTableListStateInBrowserCookie, readBrowserCookie } from './browserCookies';

describe('mergeTableListStateInBrowserCookie', () => {
  beforeEach(() => {
    document.cookie = '';
  });

  afterEach(() => {
    document.cookie = '';
  });

  it('writes merged JSON for the list key into document.cookie', () => {
    const name = 'ui_test_table_list';
    mergeTableListStateInBrowserCookie(name, 'feeds', { search: 'hello', page: 1 });

    const raw = readBrowserCookie(name);
    expect(raw).toBeDefined();
    expect(raw).toContain('feeds');
    expect(raw).toContain('hello');
    expect(raw).toContain('"page":1');
  });

  it('merges with existing cookie payload for other keys', () => {
    const name = 'ui_test_table_list_merge';
    mergeTableListStateInBrowserCookie(name, 'a', { search: 'one' });
    mergeTableListStateInBrowserCookie(name, 'b', { search: 'two' });

    const raw = readBrowserCookie(name);
    expect(raw).toBeDefined();
    expect(raw).toContain('a');
    expect(raw).toContain('b');
    expect(raw).toContain('one');
    expect(raw).toContain('two');
  });
});
