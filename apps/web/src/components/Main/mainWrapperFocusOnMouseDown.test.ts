import { describe, expect, it } from 'vitest';

import {
  MAIN_WRAPPER_INTERACTIVE_SELECTOR,
  shouldFocusMainWrapperOnMouseDown,
} from './mainWrapperFocusOnMouseDown';

describe('shouldFocusMainWrapperOnMouseDown', () => {
  it('returns true for clicks on non-interactive elements', () => {
    document.body.innerHTML = '<div id="main"><p>content</p></div>';
    const paragraph = document.querySelector('p');
    expect(paragraph).not.toBeNull();
    if (paragraph === null) {
      return;
    }
    expect(shouldFocusMainWrapperOnMouseDown(paragraph)).toBe(true);
  });

  it('returns false when the target is inside an interactive element', () => {
    document.body.innerHTML = '<div id="main"><a href="/podcasts"><span>Podcasts</span></a></div>';
    const linkLabel = document.querySelector('span');
    expect(linkLabel).not.toBeNull();
    if (linkLabel === null) {
      return;
    }
    expect(shouldFocusMainWrapperOnMouseDown(linkLabel)).toBe(false);
  });

  it('matches the keyboard shortcut interactive guard set', () => {
    expect(MAIN_WRAPPER_INTERACTIVE_SELECTOR).toContain('button');
    expect(MAIN_WRAPPER_INTERACTIVE_SELECTOR).toContain('a');
    expect(MAIN_WRAPPER_INTERACTIVE_SELECTOR).toContain('[role="button"]');
  });
});
