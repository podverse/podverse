import type { ValidationResult } from '@podverse/helpers-config';

export function normalizeSpamThresholdRaw(raw: string | undefined): string | undefined {
  if (raw === undefined) {
    return undefined;
  }
  let s = raw.trim();
  if (s === '') {
    return undefined;
  }
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s === '' ? undefined : s;
}

export function parseSpamFeedItemThresholdEnv(
  name: string,
  raw: string | undefined,
  defaultVal: number
): number {
  const normalized = normalizeSpamThresholdRaw(raw);
  if (normalized === undefined) {
    return defaultVal;
  }
  const n = Number.parseInt(normalized, 10);
  if (!Number.isFinite(n) || n < 1) {
    throw new Error(`FATAL: ${name} must be a positive integer`);
  }
  return n;
}

/** Startup validation: optional vars must be positive integers when set. */
export function validateSpamFeedItemThresholdEnvVar(
  varName: string,
  category: string,
  notSetMessage: string
): ValidationResult {
  const raw = process.env[varName];
  const normalized = normalizeSpamThresholdRaw(raw);

  if (normalized === undefined) {
    return {
      name: varName,
      isSet: false,
      isValid: true,
      isRequired: false,
      message: notSetMessage,
      category,
    };
  }

  const n = Number.parseInt(normalized, 10);
  if (!Number.isFinite(n) || n < 1) {
    return {
      name: varName,
      isSet: true,
      isValid: false,
      isRequired: false,
      message: `Must be a positive integer when set (got "${raw}")`,
      category,
    };
  }

  return {
    name: varName,
    isSet: true,
    isValid: true,
    isRequired: false,
    message: `Set (${n})`,
    category,
  };
}
