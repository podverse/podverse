import { describe, expect, it } from 'vitest';

import { formatEmbedEnclosureSourceDisplay } from '../formatEmbedEnclosureSourceDisplay';

describe('formatEmbedEnclosureSourceDisplay', () => {
  it('returns the hostname for http and https sources', () => {
    expect(
      formatEmbedEnclosureSourceDisplay('https://cdn.example.test/path/file.mp3?token=abc')
    ).toBe('cdn.example.test');
    expect(
      formatEmbedEnclosureSourceDisplay('http://localhost:4032/embed-demo/audio/sample.mp3')
    ).toBe('localhost');
  });

  it('returns the full URI for non-http(s) schemes', () => {
    expect(formatEmbedEnclosureSourceDisplay('ipfs://bafybeigdyrzt5am7gw')).toBe(
      'ipfs://bafybeigdyrzt5am7gw'
    );
    expect(formatEmbedEnclosureSourceDisplay('magnet:?xt=urn:btih:abc123')).toBe(
      'magnet:?xt=urn:btih:abc123'
    );
  });

  it('returns null for empty or missing URIs', () => {
    expect(formatEmbedEnclosureSourceDisplay(null)).toBeNull();
    expect(formatEmbedEnclosureSourceDisplay('   ')).toBeNull();
  });
});
