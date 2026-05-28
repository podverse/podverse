import { afterEach, describe, expect, it, vi } from 'vitest';

import { isEnvVarPortName, validateOptional, validateRequired } from './startupValidation.js';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('isEnvVarPortName', () => {
  it('matches PORT and *_PORT env keys', () => {
    expect(isEnvVarPortName('PORT')).toBe(true);
    expect(isEnvVarPortName('DB_PORT')).toBe(true);
    expect(isEnvVarPortName('API_PORT')).toBe(true);
    expect(isEnvVarPortName('KEYVALDB_PORT')).toBe(true);
  });

  it('does not treat OTEL_EXPORTER_OTLP_ENDPOINT as a port key', () => {
    expect(isEnvVarPortName('OTEL_EXPORTER_OTLP_ENDPOINT')).toBe(false);
  });
});

describe('validateRequired', () => {
  it('accepts OTEL_EXPORTER_OTLP_ENDPOINT as a URL when extensions need OTLP', () => {
    vi.stubEnv('OTEL_EXPORTER_OTLP_ENDPOINT', 'http://127.0.0.1:4318');
    const result = validateRequired('OTEL_EXPORTER_OTLP_ENDPOINT', 'Extensions / OpenTelemetry');
    expect(result.isValid).toBe(true);
    expect(result.message).toBe('Set');
  });

  it('accepts numeric DB_PORT and API_PORT', () => {
    vi.stubEnv('DB_PORT', '5432');
    expect(validateRequired('DB_PORT', 'App database').isValid).toBe(true);

    vi.stubEnv('API_PORT', '3000');
    expect(validateRequired('API_PORT', 'API').isValid).toBe(true);
  });

  it('rejects non-numeric DB_PORT', () => {
    vi.stubEnv('DB_PORT', 'not-a-port');
    const result = validateRequired('DB_PORT', 'App database');
    expect(result.isValid).toBe(false);
    expect(result.message).toContain('Invalid number');
  });
});

describe('validateOptional', () => {
  it('does not apply port validation to OTEL_EXPORTER_OTLP_ENDPOINT when set', () => {
    vi.stubEnv('OTEL_EXPORTER_OTLP_ENDPOINT', 'http://127.0.0.1:4318');
    const result = validateOptional(
      'OTEL_EXPORTER_OTLP_ENDPOINT',
      'Extensions / OpenTelemetry',
      'Skipped'
    );
    expect(result.isValid).toBe(true);
    expect(result.message).toBe('Set');
  });
});
