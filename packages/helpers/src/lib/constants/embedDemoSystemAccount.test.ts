import { describe, expect, it } from 'vitest';

import {
  EMBED_DEMO_SYSTEM_ACCOUNT_ID_TEXT,
  EMBED_DEMO_SYSTEM_ACCOUNT_USERNAME,
  EMBED_DEMO_SYSTEM_MEMBERSHIP_YEARS,
} from './embedDemoSystemAccount.js';

describe('embedDemoSystemAccount constants', () => {
  it('uses the demo username and stable id_text for seeds', () => {
    expect(EMBED_DEMO_SYSTEM_ACCOUNT_USERNAME).toBe('demo');
    expect(EMBED_DEMO_SYSTEM_ACCOUNT_ID_TEXT).toBe('embeddemo01');
    expect(EMBED_DEMO_SYSTEM_MEMBERSHIP_YEARS).toBe(100);
  });
});
