import { describe, expect, it } from 'vitest';

import { getSafeLinkHref } from './safeLinkHref.js';

describe('getSafeLinkHref', () => {
  it('allows internal absolute paths', () => {
    expect(getSafeLinkHref('/')).toBe('/');
    expect(getSafeLinkHref('/episode/abc')).toBe('/episode/abc');
    expect(getSafeLinkHref('/path?x=1#h')).toBe('/path?x=1#h');
  });

  it('allows query-only and hash-only relative targets', () => {
    expect(getSafeLinkHref('?page=2')).toBe('?page=2');
    expect(getSafeLinkHref('#section')).toBe('#section');
  });

  it('allows http(s), mailto, and tel', () => {
    expect(getSafeLinkHref('https://example.com/path')).toBe('https://example.com/path');
    expect(getSafeLinkHref('http://localhost:3002/foo')).toBe('http://localhost:3002/foo');
    expect(getSafeLinkHref('mailto:a@b.co')).toBe('mailto:a@b.co');
    expect(getSafeLinkHref('tel:+15551234567')).toBe('tel:+15551234567');
  });

  it('allows scheme-less relative path segments', () => {
    expect(getSafeLinkHref('relative/segment')).toBe('relative/segment');
  });

  it('rejects protocol-relative URLs', () => {
    expect(getSafeLinkHref('//evil.com')).toBeUndefined();
    expect(getSafeLinkHref('//evil.com/path')).toBeUndefined();
  });

  it('rejects javascript and other dangerous schemes', () => {
    expect(getSafeLinkHref('javascript:alert(1)')).toBeUndefined();
    expect(getSafeLinkHref('java\nscript:alert(1)')).toBeUndefined();
    expect(getSafeLinkHref('data:text/html,<script>')).toBeUndefined();
    expect(getSafeLinkHref('vbscript:msgbox(1)')).toBeUndefined();
    expect(getSafeLinkHref('file:///etc/passwd')).toBeUndefined();
  });

  it('rejects unknown schemes', () => {
    expect(getSafeLinkHref('ftp://example.com')).toBeUndefined();
    expect(getSafeLinkHref('custom:foo')).toBeUndefined();
  });

  it('rejects malformed https URLs', () => {
    expect(getSafeLinkHref('https://')).toBeUndefined();
  });

  it('returns undefined for whitespace-only input', () => {
    expect(getSafeLinkHref('   ')).toBeUndefined();
  });

  it('rejects ambiguous colon paths', () => {
    expect(getSafeLinkHref('foo:bar')).toBeUndefined();
  });
});
