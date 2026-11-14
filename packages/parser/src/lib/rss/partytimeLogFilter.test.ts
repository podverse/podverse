import { describe, expect, it } from 'vitest';

import { isResponseBodyLogArgument, omitResponseBodyLogArguments } from './partytimeLogFilter.js';

describe('omitResponseBodyLogArguments', () => {
  it('drops a markup document and keeps a short diagnostic', () => {
    expect(isResponseBodyLogArgument('<html><body>Hello</body></html>')).toBe(true);
    expect(isResponseBodyLogArgument('invalid feed')).toBe(false);
    expect(isResponseBodyLogArgument('- URL: <null>')).toBe(false);
    expect(
      omitResponseBodyLogArguments(['invalid feed', '<html><body><p>Not a feed</p></body></html>'])
    ).toEqual(['invalid feed']);
  });
});
