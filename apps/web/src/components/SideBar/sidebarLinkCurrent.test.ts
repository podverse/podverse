import { describe, expect, it } from 'vitest';

import { isSidebarLinkCurrent } from './sidebarLinkCurrent';

describe('isSidebarLinkCurrent', () => {
  it('marks home only on the home path', () => {
    expect(isSidebarLinkCurrent('/', '/', '')).toBe(true);
    expect(isSidebarLinkCurrent('/subscribed', '/', '')).toBe(true);
    expect(isSidebarLinkCurrent('/subscribed', '/subscribed', '')).toBe(true);
    expect(isSidebarLinkCurrent('/subscribed', '/browse', '')).toBe(false);
    expect(isSidebarLinkCurrent('/', '/browse', '')).toBe(false);
    expect(isSidebarLinkCurrent('/', '/podcast/abc', '')).toBe(false);
  });

  it('marks a section on its path and on routes nested under that path', () => {
    expect(isSidebarLinkCurrent('/browse', '/browse', '')).toBe(true);
    expect(isSidebarLinkCurrent('/browse', '/browse', 'type=podcasts')).toBe(true);
    expect(isSidebarLinkCurrent('/browse', '/browse/podcasts', '')).toBe(true);
    expect(isSidebarLinkCurrent('/add-by-rss', '/add-by-rss/podcast/abc', '')).toBe(true);
  });

  it('leaves the sidebar unmarked on a catalog page opened from a section', () => {
    expect(isSidebarLinkCurrent('/browse', '/podcast/abc', '')).toBe(false);
    expect(isSidebarLinkCurrent('/playlists', '/playlist/abc', '')).toBe(false);
    expect(isSidebarLinkCurrent('/queues', '/queue/abc', '')).toBe(false);
  });

  it('marks My Clips only while the clips tab is in the URL', () => {
    const href = '/my-profile?tab=clips';
    expect(isSidebarLinkCurrent(href, '/my-profile', 'tab=clips')).toBe(true);
    expect(isSidebarLinkCurrent(href, '/my-profile', 'tab=clips&page=2')).toBe(true);
    expect(isSidebarLinkCurrent(href, '/my-profile', '')).toBe(false);
    expect(isSidebarLinkCurrent(href, '/my-profile', 'tab=podcasts')).toBe(false);
    expect(isSidebarLinkCurrent(href, '/my-clips', '')).toBe(false);
  });

  it('ignores a trailing slash on the path', () => {
    expect(isSidebarLinkCurrent('/history/', '/history', '')).toBe(true);
    expect(isSidebarLinkCurrent('/history', '/history/', '')).toBe(true);
  });
});
