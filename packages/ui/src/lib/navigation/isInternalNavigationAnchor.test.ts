import { describe, expect, it } from 'vitest';

import { isInternalNavigationAnchor, wouldChangeAppRoute } from './isInternalNavigationAnchor';

describe('isInternalNavigationAnchor', () => {
  it('accepts same-origin relative paths', () => {
    const anchor = document.createElement('a');
    anchor.setAttribute('href', '/podcasts');

    expect(isInternalNavigationAnchor(anchor)).toBe(true);
  });

  it('rejects external http links', () => {
    const anchor = document.createElement('a');
    anchor.setAttribute('href', 'https://example.com/podcasts');

    expect(isInternalNavigationAnchor(anchor)).toBe(false);
  });

  it('rejects new-tab modifier clicks', () => {
    const anchor = document.createElement('a');
    anchor.setAttribute('href', '/podcasts');

    expect(
      isInternalNavigationAnchor(anchor, {
        altKey: false,
        button: 0,
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
      })
    ).toBe(false);
  });

  it('rejects hash-only and blank hrefs', () => {
    const hashAnchor = document.createElement('a');
    hashAnchor.setAttribute('href', '#section');
    expect(isInternalNavigationAnchor(hashAnchor)).toBe(false);

    const emptyAnchor = document.createElement('a');
    emptyAnchor.setAttribute('href', '');
    expect(isInternalNavigationAnchor(emptyAnchor)).toBe(false);
  });
});

describe('wouldChangeAppRoute', () => {
  it('detects pathname and search changes', () => {
    window.history.replaceState({}, '', '/podcasts?page=1');

    expect(wouldChangeAppRoute('/episodes')).toBe(true);
    expect(wouldChangeAppRoute('/podcasts?page=2')).toBe(true);
    expect(wouldChangeAppRoute('/podcasts?page=1')).toBe(false);
    expect(wouldChangeAppRoute('#top')).toBe(false);
  });
});
