import { describe, expect, it } from 'vitest';

import { normalizeEmail } from './email.js';

describe('normalizeEmail', () => {
  it('trims and lowercases so letter case and spacing compare equal', () => {
    expect(normalizeEmail('  Person.Name+Tag@Example.COM ')).toBe('person.name+tag@example.com');
    expect(normalizeEmail('person@example.com')).toBe('person@example.com');
  });
});
