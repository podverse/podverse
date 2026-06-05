import { expect, test } from '@playwright/test';

test.describe('Management-web SEO noindex', () => {
  test('SSR login page HTML includes noindex robots metadata', async ({ request }) => {
    const response = await request.get('/');
    expect(response.ok()).toBeTruthy();

    const html = await response.text();
    expect(html).toMatch(
      /<meta[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex[^"']*["'][^>]*>/i
    );
  });
});
