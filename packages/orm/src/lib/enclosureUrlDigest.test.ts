import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { DATABASE_CONSTANTS } from '@podverse/helpers';

import { enclosureUrlDigest } from './enclosureUrlDigest.js';

describe('enclosureUrlDigest', () => {
  it('is the md5 of the stored enclosure URL', () => {
    const url = 'https://cdn.example.com/audio/episode-42.mp3';

    expect(enclosureUrlDigest(url).toString('hex')).toBe('a7ca6c6aa0fadcc52d868e602f4a9a98');
    expect(enclosureUrlDigest(url)).toEqual(createHash('md5').update(url, 'utf8').digest());
  });

  it('hashes the 2083-character prefix that guid_enclosure_url stores', () => {
    const stored = 'a'.repeat(DATABASE_CONSTANTS.varchar_url);
    const longer = `${stored}EXTRA`;

    expect(enclosureUrlDigest(longer)).toEqual(enclosureUrlDigest(stored));
  });
});
