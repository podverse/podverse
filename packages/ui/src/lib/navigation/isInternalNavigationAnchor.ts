export type InternalNavigationPointerEvent = Pick<
  MouseEvent,
  'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey' | 'button'
>;

/**
 * True when an anchor click should trigger in-app client navigation (not a new tab or external URL).
 */
export function isInternalNavigationAnchor(
  anchor: HTMLAnchorElement,
  event?: InternalNavigationPointerEvent
): boolean {
  const href = anchor.getAttribute('href');
  if (href === null || href === '' || href.startsWith('#')) {
    return false;
  }

  if (anchor.target === '_blank' || anchor.hasAttribute('download')) {
    return false;
  }

  if (event !== undefined) {
    if (event.button !== 0) {
      return false;
    }
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return false;
    }
  }

  if (href.startsWith('/')) {
    return true;
  }

  try {
    const url = new URL(href, window.location.origin);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return false;
    }
    return url.origin === window.location.origin;
  } catch {
    return false;
  }
}

/**
 * True when resolving `href` against the current document would change pathname or search.
 */
export function wouldChangeAppRoute(href: string): boolean {
  if (href.startsWith('#')) {
    return false;
  }

  try {
    const next = new URL(href, window.location.href);
    const current = new URL(window.location.href);
    return next.pathname !== current.pathname || next.search !== current.search;
  } catch {
    return false;
  }
}
