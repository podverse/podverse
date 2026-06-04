import { test } from '@playwright/test';

import { expectRobotsNoindex, fetchSsrHtml } from './helpers/seoHtml';

test.describe('Web SEO noindex routes', () => {
  test('SSR HTML marks auth and utility routes as noindex', async ({ request }) => {
    await test.step('Assert settings route is noindex in SSR metadata.', async () => {
      const html = await fetchSsrHtml(request, '/settings');
      expectRobotsNoindex(html);
    });

    await test.step('Assert search route is noindex in SSR metadata.', async () => {
      const html = await fetchSsrHtml(request, '/search');
      expectRobotsNoindex(html);
    });

    await test.step('Assert sign-up route is noindex in SSR metadata.', async () => {
      const html = await fetchSsrHtml(request, '/sign-up');
      expectRobotsNoindex(html);
    });

    await test.step('Assert queues route is noindex in SSR metadata.', async () => {
      const html = await fetchSsrHtml(request, '/queues');
      expectRobotsNoindex(html);
    });

    await test.step('Assert history route is noindex in SSR metadata.', async () => {
      const html = await fetchSsrHtml(request, '/history');
      expectRobotsNoindex(html);
    });
  });

  test('guest my-profile route remains non-indexable even when it redirects', async ({
    request,
  }) => {
    const response = await request.get('/my-profile', { maxRedirects: 0 });
    if (response.status() >= 300 && response.status() < 400) {
      return;
    }

    const html = await response.text();
    expectRobotsNoindex(html);
  });
});
