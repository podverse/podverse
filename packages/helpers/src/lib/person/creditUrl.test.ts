import { describe, expect, it } from 'vitest';

import { personCreditHttpUrl } from './creditUrl.js';

describe('personCreditHttpUrl', () => {
  it('keeps an http or https URL, including a host that may be down', () => {
    expect(personCreditHttpUrl('https://dave.sobr.org')).toBe('https://dave.sobr.org/');
    expect(personCreditHttpUrl('  http://feeds.podcastindex.org/avatar.jpg ')).toBe(
      'http://feeds.podcastindex.org/avatar.jpg'
    );
  });

  it('drops a URL that is not http or https', () => {
    expect(personCreditHttpUrl('javascript:alert(1)')).toBeNull();
    expect(personCreditHttpUrl('mailto:ada@example.com')).toBeNull();
    expect(personCreditHttpUrl('not a url')).toBeNull();
    expect(personCreditHttpUrl('')).toBeNull();
    expect(personCreditHttpUrl(null)).toBeNull();
    expect(personCreditHttpUrl(undefined)).toBeNull();
  });
});
