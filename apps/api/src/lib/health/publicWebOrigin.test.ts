import { describe, expect, it } from 'vitest';

import { publicWebOriginFromConfig } from './publicWebOrigin.js';

describe('publicWebOriginFromConfig', () => {
  it('joins protocol and domain into an origin', () => {
    expect(publicWebOriginFromConfig('https', 'pv.example')).toBe('https://pv.example');
    expect(publicWebOriginFromConfig('http', 'localhost:3000/')).toBe('http://localhost:3000');
    expect(publicWebOriginFromConfig('https:', 'pv.example')).toBe('https://pv.example');
  });

  it('returns null when the pair is not an origin', () => {
    expect(publicWebOriginFromConfig('https', 'pv.example/episode')).toBeNull();
    expect(publicWebOriginFromConfig('https', 'user:secret@pv.example')).toBeNull();
    expect(publicWebOriginFromConfig('https', 'pv.example?token=1')).toBeNull();
    expect(publicWebOriginFromConfig('ftp', 'pv.example')).toBeNull();
    expect(publicWebOriginFromConfig('https', '')).toBeNull();
    expect(publicWebOriginFromConfig(undefined, 'pv.example')).toBeNull();
    expect(publicWebOriginFromConfig('https', undefined)).toBeNull();
  });
});
