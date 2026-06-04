import { expect, test } from '@playwright/test';

import { expectRobotsNoindex, fetchSsrHtml } from './helpers/seoHtml';

test.describe('Web SEO profile sharable-status behavior', () => {
  test('a discoverable public profile remains indexable', async ({ request }) => {
    const profilesHtml = await fetchSsrHtml(request, '/profiles');
    const profileLinkMatch = profilesHtml.match(/\/profile\/([a-zA-Z0-9_-]+)/);
    expect(profileLinkMatch).toBeTruthy();

    const publicIdText = profileLinkMatch?.[1];
    expect(publicIdText).toBeTruthy();

    const publicProfileHtml = await fetchSsrHtml(request, `/profile/${publicIdText}`);
    expect(publicProfileHtml).not.toMatch(/name=["']robots["'][^>]*noindex/i);
  });

  test('a non-public or missing profile remains non-indexable via noindex or redirect', async ({
    request,
  }) => {
    const response = await request.get('/profile/e2e-seo-private-profile-placeholder', {
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
