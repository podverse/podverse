import { afterEach, describe, expect, it } from 'vitest';

import { clearCookie, readCookie, writeCookie } from './cookie.js';

type MockDocument = {
  cookie: string;
};

function setMockDocumentCookie(cookie: string) {
  const mockDocument: MockDocument = { cookie };
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: mockDocument,
  });
}

describe('cookie utilities', () => {
  afterEach(() => {
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: undefined,
    });
  });

  it('reads matching cookie values and keeps "=" inside values', () => {
    setMockDocumentCookie('foo=bar; token=a=b=c; x=y');
    expect(readCookie('foo')).toBe('bar');
    expect(readCookie('token')).toBe('a=b=c');
    expect(readCookie('missing')).toBeUndefined();
  });

  it('writes cookies with path and max-age', () => {
    setMockDocumentCookie('');
    writeCookie('theme', 'dark', 120);
    expect(globalThis.document.cookie).toBe('theme=dark; path=/; max-age=120');
  });

  it('clears cookies with max-age 0', () => {
    setMockDocumentCookie('theme=dark');
    clearCookie('theme');
    expect(globalThis.document.cookie).toBe('theme=; path=/; max-age=0');
  });
});
