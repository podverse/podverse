import { describe, expect, it } from 'vitest';

import { resolveResumeAtSecondsForEnclosureSwitch } from '../resolveResumeAtSecondsForEnclosureSwitch';

describe('resolveResumeAtSecondsForEnclosureSwitch', () => {
  it('prefers the live media element playhead when available', () => {
    expect(resolveResumeAtSecondsForEnclosureSwitch(83.42, 80)).toBe(83.42);
  });

  it('falls back to context time when the element time is unavailable', () => {
    expect(resolveResumeAtSecondsForEnclosureSwitch(undefined, 80)).toBe(80);
  });

  it('accepts zero from the element as a valid playhead', () => {
    expect(resolveResumeAtSecondsForEnclosureSwitch(0, 42)).toBe(0);
  });
});
