import { INVALID_SPANID, INVALID_TRACEID } from '@opentelemetry/api';
import { describe, expect, it } from 'vitest';

import { toValidSpanId, toValidTraceId } from './spanContextIds.js';

describe('spanContextIds', () => {
  it('rejects OTEL invalid trace and span ids', () => {
    expect(toValidTraceId(INVALID_TRACEID)).toBeUndefined();
    expect(toValidSpanId(INVALID_SPANID)).toBeUndefined();
  });

  it('accepts valid hex ids', () => {
    expect(toValidTraceId('4bf92f3577b34da6a3ce929d0e0e4736')).toBe(
      '4bf92f3577b34da6a3ce929d0e0e4736'
    );
    expect(toValidSpanId('00f067aa0ba902b7')).toBe('00f067aa0ba902b7');
  });

  it('returns undefined for missing ids', () => {
    expect(toValidTraceId(undefined)).toBeUndefined();
    expect(toValidSpanId(undefined)).toBeUndefined();
  });
});
