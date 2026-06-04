import { expect } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';

export async function fetchSsrHtml(request: APIRequestContext, path: string): Promise<string> {
  const response = await request.get(path);
  expect(response.ok()).toBeTruthy();
  return response.text();
}

const escapeRegExp = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export function expectMetaDescriptionContains(html: string, fragment: string): void {
  expect(html).toMatch(
    new RegExp(
      `<meta[^>]*name=["']description["'][^>]*content=["'][^"']*${escapeRegExp(fragment)}[^"']*["'][^>]*>`,
      'i'
    )
  );
}

export function expectRobotsNoindex(html: string): void {
  expect(html).toMatch(/<meta[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex[^"']*["'][^>]*>/i);
}

export function expectCanonical(html: string, url: string): void {
  expect(html).toMatch(
    new RegExp(`<link[^>]*rel=["']canonical["'][^>]*href=["']${escapeRegExp(url)}["'][^>]*>`, 'i')
  );
}
