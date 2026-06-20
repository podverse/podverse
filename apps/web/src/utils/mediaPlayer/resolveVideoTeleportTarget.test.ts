import { describe, expect, it } from 'vitest';

import { resolveVideoTeleportTarget } from './resolveVideoTeleportTarget';

describe('resolveVideoTeleportTarget', () => {
  const floating = document.createElement('div');
  const modal = document.createElement('div');
  const holder = document.createElement('div');

  it('returns the modal target when in full-modal and the modal target exists', () => {
    expect(resolveVideoTeleportTarget('full-modal', floating, modal, holder)).toBe(modal);
  });

  it('returns the floating target when floating and the floating target exists', () => {
    expect(resolveVideoTeleportTarget('floating', floating, modal, holder)).toBe(floating);
  });

  it('falls back to the holder when in full-modal but the modal target is not mounted yet', () => {
    expect(resolveVideoTeleportTarget('full-modal', floating, null, holder)).toBe(holder);
  });

  it('falls back to the holder when floating but the floating target is not mounted yet', () => {
    expect(resolveVideoTeleportTarget('floating', null, modal, holder)).toBe(holder);
  });

  it('falls back to the holder for embedded or null locations', () => {
    expect(resolveVideoTeleportTarget('embedded', floating, modal, holder)).toBe(holder);
    expect(resolveVideoTeleportTarget(null, floating, modal, holder)).toBe(holder);
  });
});
