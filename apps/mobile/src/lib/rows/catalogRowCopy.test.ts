import { describe, expect, it } from 'vitest';

import type { DTOAccount, DTOPlaylist } from '@podverse/helpers';

import type { CatalogRowTranslate } from './catalogRowCopy';
import {
  formatPlaylistRowSubtitle,
  playlistCreatorLabel,
  profileBio,
  profileDisplayName,
} from './catalogRowCopy';

const t: CatalogRowTranslate = (key, options) => {
  if (key === 'features.playlist.item_count') {
    return `Items: ${options?.count ?? 0}`;
  }
  if (key === 'misc.anonymous') {
    return 'Anonymous';
  }
  return key;
};

const playlist = (overrides: Partial<DTOPlaylist> = {}): DTOPlaylist => {
  return {
    id: 1,
    id_text: 'pl1',
    is_default_likes: false,
    item_count: 3,
    last_updated: '2026-01-01T00:00:00.000Z',
    medium_id: 1,
    sharable_status_id: 1,
    title: 'Mix',
    ...overrides,
  };
};

const account = (overrides: Partial<DTOAccount> = {}): DTOAccount => {
  return {
    id: 2,
    id_text: 'acct',
    verified: true,
    ...overrides,
  };
};

describe('formatPlaylistRowSubtitle', () => {
  it('joins item count and description the way web does', () => {
    expect(formatPlaylistRowSubtitle(playlist({ description: 'Night drive' }), t)).toBe(
      'Items: 3 – Night drive'
    );
  });

  it('omits a missing or blank description', () => {
    expect(formatPlaylistRowSubtitle(playlist(), t)).toBe('Items: 3');
    expect(formatPlaylistRowSubtitle(playlist({ description: '   ' }), t)).toBe('Items: 3');
  });
});

describe('playlistCreatorLabel', () => {
  it('uses the owner display name', () => {
    expect(
      playlistCreatorLabel(
        playlist({
          account: account({
            account_profile: { account_id: 2, display_name: 'Ada Chen', id: 9 },
          }),
        }),
        t
      )
    ).toBe('Ada Chen');
  });

  it('falls back to anonymous when the owner name is missing', () => {
    expect(playlistCreatorLabel(playlist(), t)).toBe('Anonymous');
    expect(
      playlistCreatorLabel(
        playlist({
          account: account({
            account_profile: { account_id: 2, display_name: '  ', id: 9 },
          }),
        }),
        t
      )
    ).toBe('Anonymous');
  });
});

describe('profile row copy', () => {
  it('uses the display name and a trimmed bio', () => {
    const profile = account({
      account_profile: { account_id: 2, bio: '  Hosts a show  ', display_name: 'Ada Chen', id: 9 },
    });
    expect(profileDisplayName(profile, t)).toBe('Ada Chen');
    expect(profileBio(profile)).toBe('Hosts a show');
  });

  it('falls back to anonymous and omits a blank bio', () => {
    const profile = account({
      account_profile: { account_id: 2, bio: ' ', display_name: '', id: 9 },
    });
    expect(profileDisplayName(profile, t)).toBe('Anonymous');
    expect(profileBio(profile)).toBeNull();
  });
});
