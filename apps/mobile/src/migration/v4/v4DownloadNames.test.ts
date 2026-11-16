import { describe, expect, it } from 'vitest';

import {
  classifyV4SharedFolder,
  isSafeV4FileKey,
  isV4OrphanMediaName,
  legacyExtensionOfName,
  matchesV4SharedFolderName,
  nestedDirectoriesOf,
  safDocumentDisplayName,
  v4ExtensionFromUrl,
  v4FileKey,
  v5FileExtensionForV4,
} from './v4DownloadNames';

describe('v4ExtensionFromUrl', () => {
  it('keeps the extension, drops the query, and keeps a hash', () => {
    expect(v4ExtensionFromUrl('https://cdn.example/ep.mp3')).toBe('.mp3');
    expect(v4ExtensionFromUrl('https://cdn.example/ep.mp3?token=1')).toBe('.mp3');
    expect(v4ExtensionFromUrl('https://cdn.example/ep.mp3#t=1')).toBe('.mp3#t=1');
    expect(v4ExtensionFromUrl('https://cdn.example/ep.MP3')).toBe('.MP3');
    expect(v4ExtensionFromUrl('https://cdn.example/media/')).toBe('.mp3');
    expect(v4ExtensionFromUrl('https://x.test/media/abc')).toBe('.abc');
    expect(v4ExtensionFromUrl('https://cdn.example/ep.')).toBe('.mp3');
    expect(v4FileKey('episode-id', '.mp3')).toBe('episode-id.mp3');
  });
});

describe('isSafeV4FileKey', () => {
  it('accepts a nested base64 key and rejects traversal', () => {
    expect(isSafeV4FileKey('ab+c/de=.mp3')).toBe(true);

    expect(isSafeV4FileKey('../x.mp3')).toBe(false);
    expect(isSafeV4FileKey('a/../b.mp3')).toBe(false);
    expect(isSafeV4FileKey('a/./b.mp3')).toBe(false);
    expect(isSafeV4FileKey('/x.mp3')).toBe(false);
    expect(isSafeV4FileKey('a//b.mp3')).toBe(false);
    expect(isSafeV4FileKey('')).toBe(false);
    expect(isSafeV4FileKey('a\\b.mp3')).toBe(false);
    expect(isSafeV4FileKey('a\0b.mp3')).toBe(false);
  });
});

describe('classifyV4SharedFolder', () => {
  it('separates an external-storage tree, another provider, a path, and junk', () => {
    expect(
      classifyV4SharedFolder(
        'content://com.android.externalstorage.documents/tree/primary%3APodcasts'
      )
    ).toEqual({
      kind: 'saf_tree',
      uri: 'content://com.android.externalstorage.documents/tree/primary%3APodcasts',
    });
    expect(
      classifyV4SharedFolder('content://com.android.providers.downloads.documents/tree/downloads')
    ).toEqual({ kind: 'unsupported' });
    expect(classifyV4SharedFolder('/storage/emulated/0/Podcasts')).toEqual({
      kind: 'path',
      uri: 'file:///storage/emulated/0/Podcasts',
    });
    expect(classifyV4SharedFolder('/storage/emulated/0/Podcasts/')).toEqual({
      kind: 'path',
      uri: 'file:///storage/emulated/0/Podcasts',
    });
    expect(classifyV4SharedFolder(null)).toBeNull();
    expect(classifyV4SharedFolder('')).toBeNull();
    expect(classifyV4SharedFolder('   ')).toBeNull();
    expect(classifyV4SharedFolder('Podcasts')).toEqual({ kind: 'unsupported' });
  });
});

describe('safDocumentDisplayName', () => {
  it('reads a nested id, a volume-root id, and a bad escape', () => {
    expect(
      safDocumentDisplayName(
        'content://com.android.externalstorage.documents/document/primary%3APodcasts%2Fep.mp3'
      )
    ).toBe('ep.mp3');
    expect(
      safDocumentDisplayName(
        'content://com.android.externalstorage.documents/document/primary%3Aep.mp3'
      )
    ).toBe('ep.mp3');
    expect(
      safDocumentDisplayName(
        'content://com.android.externalstorage.documents/document/primary%3A%E0%A4%A'
      )
    ).toBeNull();
  });
});

describe('matchesV4SharedFolderName', () => {
  it('matches the safe name, an appended mp3, and one clash suffix', () => {
    expect(matchesV4SharedFolderName('abc.mp3', 'abc.mp3')).toBe(true);
    expect(matchesV4SharedFolderName('abc.m4a.mp3', 'abc.m4a')).toBe(true);
    expect(matchesV4SharedFolderName('abc (1).mp3', 'abc.mp3')).toBe(true);
    expect(matchesV4SharedFolderName('abc.m4a (1).mp3', 'abc.m4a')).toBe(true);
    expect(matchesV4SharedFolderName('ab_cd.mp3', 'ab/cd.mp3')).toBe(true);
    expect(matchesV4SharedFolderName('ep10.mp3', 'ep1.mp3')).toBe(false);
    expect(matchesV4SharedFolderName('abcd.mp3', 'abc')).toBe(false);
  });
});

describe('isV4OrphanMediaName and v5FileExtensionForV4', () => {
  it('accepts known extensions in either case and rejects the rest', () => {
    expect(isV4OrphanMediaName('episode.mp3')).toBe(true);
    expect(isV4OrphanMediaName('episode.MP3')).toBe(true);
    expect(isV4OrphanMediaName('notes.txt')).toBe(false);
    expect(isV4OrphanMediaName('a/episode.mp3')).toBe(false);
    expect(isV4OrphanMediaName('../x.mp3')).toBe(false);

    expect(v5FileExtensionForV4('.mp3')).toBe('mp3');
    expect(v5FileExtensionForV4('.MP3')).toBe('mp3');
    expect(v5FileExtensionForV4('.m4a')).toBe('m4a');
    expect(v5FileExtensionForV4('.txt')).toBeNull();
    expect(v5FileExtensionForV4('.mp3#t=1')).toBeNull();
    expect(legacyExtensionOfName('episode.MP3')).toBe('.MP3');
    expect(legacyExtensionOfName('episode')).toBe('');
  });
});

describe('nestedDirectoriesOf', () => {
  it('returns folder prefixes deepest first, and nothing for a top-level key', () => {
    expect(nestedDirectoriesOf('episode.mp3')).toEqual([]);
    expect(nestedDirectoriesOf('a/b/c.mp3')).toEqual(['a/b', 'a']);
  });
});
