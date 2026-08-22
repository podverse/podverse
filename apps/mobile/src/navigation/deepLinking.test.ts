import { describe, expect, it } from 'vitest';

import {
  isAuthGatedDeepLink,
  mapIncomingPathToScopedPath,
  mapScopedPathToFlatPath,
} from './deepLinking';

describe('mapIncomingPathToScopedPath', () => {
  it('maps flat content routes to home-scoped paths', () => {
    expect(mapIncomingPathToScopedPath('/podcast/pod123')).toBe('/home/podcast/pod123');
    expect(mapIncomingPathToScopedPath('/episode/ep123')).toBe('/home/episode/ep123');
    expect(mapIncomingPathToScopedPath('/clip/clip123')).toBe('/home/clip/clip123');
    expect(mapIncomingPathToScopedPath('/album/alb123')).toBe('/home/album/alb123');
    expect(mapIncomingPathToScopedPath('/artist/art123')).toBe('/home/artist/art123');
    expect(mapIncomingPathToScopedPath('/track/trk123')).toBe('/home/track/trk123');
  });

  it('keeps nav-scoped paths unchanged', () => {
    expect(mapIncomingPathToScopedPath('/more/settings')).toBe('/more/settings');
    expect(mapIncomingPathToScopedPath('/search/podcast/pod123')).toBe('/search/podcast/pod123');
  });

  it('maps playlist and profile routes to their tab-scoped stacks', () => {
    expect(mapIncomingPathToScopedPath('/playlist/plst123')).toBe('/my-library/playlist/plst123');
    expect(mapIncomingPathToScopedPath('/profile/user123')).toBe('/more/profile/user123');
  });

  it('maps bare settings to more settings', () => {
    expect(mapIncomingPathToScopedPath('/settings')).toBe('/more/settings');
  });

  it('handles full web URLs and strips query/hash', () => {
    expect(mapIncomingPathToScopedPath('https://podverse.fm/podcast/pod123?foo=1#bar')).toBe(
      '/home/podcast/pod123'
    );
  });

  it('handles full custom-scheme deep links (host is a route segment, not a domain)', () => {
    // The buffer path (App.tsx pending-deep-link + notification open) forwards the full scheme
    // URL, so the leading route segment arrives as the URL "host" and must be preserved.
    expect(mapIncomingPathToScopedPath('podverse-next://podcast/pod123')).toBe(
      '/home/podcast/pod123'
    );
    expect(mapIncomingPathToScopedPath('podverse://podcast/pod123')).toBe('/home/podcast/pod123');
    expect(mapIncomingPathToScopedPath('podverse-next://podcast/pod123?foo=1#bar')).toBe(
      '/home/podcast/pod123'
    );
    expect(mapIncomingPathToScopedPath('podverse-next://home')).toBe('/home');
    expect(mapIncomingPathToScopedPath('podverse-next://more/settings')).toBe('/more/settings');
    expect(mapIncomingPathToScopedPath('podverse-next://playlist/plst123')).toBe(
      '/my-library/playlist/plst123'
    );
  });

  it('falls back to home for empty or unknown routes', () => {
    expect(mapIncomingPathToScopedPath('')).toBe('/home');
    expect(mapIncomingPathToScopedPath('/not-a-route')).toBe('/home');
  });
});

describe('mapScopedPathToFlatPath', () => {
  it('maps scoped content routes to flat web paths', () => {
    expect(mapScopedPathToFlatPath('/home/podcast/pod123')).toBe('/podcast/pod123');
    expect(mapScopedPathToFlatPath('/home/episode/ep123')).toBe('/episode/ep123');
    expect(mapScopedPathToFlatPath('/home/clip/clip123')).toBe('/clip/clip123');
    expect(mapScopedPathToFlatPath('/home/album/alb123')).toBe('/album/alb123');
    expect(mapScopedPathToFlatPath('/home/artist/art123')).toBe('/artist/art123');
    expect(mapScopedPathToFlatPath('/home/track/trk123')).toBe('/track/trk123');
  });

  it('maps scoped playlist/profile routes to flat paths', () => {
    expect(mapScopedPathToFlatPath('/my-library/playlist/plst123')).toBe('/playlist/plst123');
    expect(mapScopedPathToFlatPath('/more/profile/user123')).toBe('/profile/user123');
  });

  it('returns normalized path for non-mapped routes and strips query/hash', () => {
    expect(mapScopedPathToFlatPath('/more/settings')).toBe('/more/settings');
    expect(mapScopedPathToFlatPath('/more/settings?foo=1#bar')).toBe('/more/settings');
  });
});

describe('isAuthGatedDeepLink', () => {
  it('returns true for auth-gated routes', () => {
    expect(isAuthGatedDeepLink('/history')).toBe(true);
    expect(isAuthGatedDeepLink('/queues')).toBe(true);
    expect(isAuthGatedDeepLink('/my-profile')).toBe(true);
    expect(isAuthGatedDeepLink('/settings')).toBe(true);
  });

  it('returns false for public routes', () => {
    expect(isAuthGatedDeepLink('/podcast/pod123')).toBe(false);
    expect(isAuthGatedDeepLink('/episode/ep123')).toBe(false);
    expect(isAuthGatedDeepLink('/playlist/plst123')).toBe(false);
  });
});
