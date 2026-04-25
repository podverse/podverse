import { QueryFailedError } from 'typeorm';
import { describe, expect, it } from 'vitest';

import { isPostgresUniqueViolation, PG_UNIQUE_VIOLATION } from './postgresUniqueViolation.js';

describe('isPostgresUniqueViolation', () => {
  it('returns true for QueryFailedError with driver code 23505', () => {
    const driver = Object.assign(new Error('duplicate key'), { code: PG_UNIQUE_VIOLATION });
    const err = new QueryFailedError('q', [], driver);
    expect(isPostgresUniqueViolation(err)).toBe(true);
  });

  it('returns true when 23505 is on the error body', () => {
    const driver = Object.assign(new Error('duplicate key'), { code: PG_UNIQUE_VIOLATION });
    const err = new QueryFailedError('q', [], driver);
    expect(isPostgresUniqueViolation(err)).toBe(true);
  });

  it('returns false for other query errors', () => {
    const driver = Object.assign(new Error('invalid text representation'), { code: '22P02' });
    const err = new QueryFailedError('q', [], driver);
    expect(isPostgresUniqueViolation(err)).toBe(false);
  });

  it('returns false for non-QueryFailedError', () => {
    expect(isPostgresUniqueViolation(new Error('no'))).toBe(false);
  });
});
