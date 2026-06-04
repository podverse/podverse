import { expect, test } from '@playwright/test';

test.describe('Web robots and sitemap', () => {
  test('robots.txt includes disallow rules and sitemap reference', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(response.ok()).toBeTruthy();

    const body = await response.text();
    expect(body).toContain('Disallow: /settings');
    expect(body).toContain('Sitemap:');
  });

  test('sitemap.xml includes baseline static URLs', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.ok()).toBeTruthy();

    const body = await response.text();
    expect(body).toContain('/podcasts');
    expect(body).toContain('https://');
  });
});
