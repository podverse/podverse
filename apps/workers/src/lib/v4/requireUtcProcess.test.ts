import { describe, expect, it } from 'vitest';

import { requireUtcProcess } from './requireUtcProcess.js';

const COMMAND = 'v4RunFullRehearsal';
const REFUSAL = `${COMMAND} must run with TZ=UTC.`;
const SUMMER_UTC = Date.UTC(2026, 6, 1);

function stubTimezoneOffset(offsetFor: (date: Date) => number): () => void {
  const original = Date.prototype.getTimezoneOffset;
  Date.prototype.getTimezoneOffset = function stubbedOffset(this: Date) {
    return offsetFor(this);
  };
  return () => {
    Date.prototype.getTimezoneOffset = original;
  };
}

describe('requireUtcProcess', () => {
  it('passes when the winter and summer offsets are zero', () => {
    const restore = stubTimezoneOffset(() => 0);
    try {
      expect(() => requireUtcProcess(COMMAND)).not.toThrow();
    } finally {
      restore();
    }
  });

  it('throws when the zone is UTC only in winter', () => {
    const restore = stubTimezoneOffset((date) => (date.getTime() === SUMMER_UTC ? -60 : 0));
    try {
      expect(() => requireUtcProcess(COMMAND)).toThrow(REFUSAL);
    } finally {
      restore();
    }
  });

  it('throws when the offset is not zero', () => {
    const restore = stubTimezoneOffset(() => 360);
    try {
      expect(() => requireUtcProcess(COMMAND)).toThrow(REFUSAL);
    } finally {
      restore();
    }
  });
});
