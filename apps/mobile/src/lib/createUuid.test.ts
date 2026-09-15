import { describe, expect, it } from 'vitest';

import { createUuid } from './createUuid';

describe('createUuid', () => {
  it('returns a version-4 UUID string', () => {
    expect(createUuid()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });
});
