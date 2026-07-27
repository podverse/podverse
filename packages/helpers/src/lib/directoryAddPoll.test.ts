import { describe, expect, it } from 'vitest';

import { DIRECTORY_ADD_POLL_TIMEOUT_MS } from './directoryAddPoll.js';
import { ONE_MINUTE_MS } from './timeConstants.js';

describe('directoryAddPoll', () => {
  it('caps directory-add client polling at 10 minutes', () => {
    expect(DIRECTORY_ADD_POLL_TIMEOUT_MS).toBe(10 * ONE_MINUTE_MS);
  });
});
