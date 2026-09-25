import { describe, expect, it } from 'vitest';

import { shouldMountRowMoreMenu } from './rowMoreMenuMount';

describe('shouldMountRowMoreMenu', () => {
  it('does not mount the menu when more actions exist but the menu has never opened', () => {
    expect(shouldMountRowMoreMenu(true, false)).toBe(false);
  });

  it('mounts after the first open and stays mounted after close', () => {
    expect(shouldMountRowMoreMenu(true, true)).toBe(true);
  });

  it('does not mount when the row has no more actions', () => {
    expect(shouldMountRowMoreMenu(false, false)).toBe(false);
    expect(shouldMountRowMoreMenu(false, true)).toBe(false);
  });
});
