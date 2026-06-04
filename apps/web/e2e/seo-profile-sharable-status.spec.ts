import { expect, test } from '@playwright/test';

import {
  E2E_SEO_PRIVATE_PROFILE_PLACEHOLDER_ID_TEXT,
  E2E_SEO_PUBLIC_PROFILE_ID_TEXT,
} from './helpers/seedConstants';
import { expectRobotsIndexable, expectRobotsNoindex, fetchSsrHtml } from './helpers/seoHtml';

test.describe('Web SEO profile sharable-status behavior', () => {
  test('a discoverable public profile remains indexable', async ({ request }) => {
    const profilesHtml = await fetchSsrHtml(request, '/profiles');
    expect(profilesHtml).toContain(`/profile/${E2E_SEO_PUBLIC_PROFILE_ID_TEXT}`);

    const publicProfileHtml = await fetchSsrHtml(
      request,
      `/profile/${E2E_SEO_PUBLIC_PROFILE_ID_TEXT}`
    );
    expectRobotsIndexable(publicProfileHtml);
  });

  test('a non-public or missing profile remains non-indexable via noindex or redirect', async ({
    request,
  }) => {
    const response = await request.get(`/profile/${E2E_SEO_PRIVATE_PROFILE_PLACEHOLDER_ID_TEXT}`, {
      maxRedirects: 0,
    });

    if (response.status() >= 300 && response.status() < 400) {
      expect(response.headers().location).toContain('/profiles');
      return;
    }

    const html = await response.text();
    expectRobotsNoindex(html);
  });
});
