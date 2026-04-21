import type { ValidationOptions } from 'joi';

/**
 * Global request validation policy (PVSA-007):
 * - **stripUnknown: true** — unknown keys are removed before handlers run (over-posting cannot affect mutation logic).
 * - **abortEarly: true** — return first validation error.
 *
 * Schemas that intentionally allow extra keys must use `.unknown(true)` (e.g. live item list queries that
 * forward pagination/sort params to shared list handlers).
 */
export const DEFAULT_JOI_VALIDATION_OPTIONS: ValidationOptions = {
  abortEarly: true,
  stripUnknown: true,
};
