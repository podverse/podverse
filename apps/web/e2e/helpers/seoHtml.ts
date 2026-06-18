import type { APIRequestContext } from '@playwright/test';
import { expect } from '@playwright/test';

export async function fetchSsrHtml(request: APIRequestContext, path: string): Promise<string> {
  const response = await request.get(path);
  expect(response.ok()).toBeTruthy();
  return response.text();
}

const escapeRegExp = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export function extractHeadHtml(html: string): string {
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  return headMatch?.[1] ?? html;
}

const buildMetaTagPattern = (metaName: string, contentFragment: string): RegExp => {
  return new RegExp(
    `<meta[^>]*(?:name=["']${metaName}["'][^>]*content=["'][^"']*${escapeRegExp(contentFragment)}|content=["'][^"']*${escapeRegExp(contentFragment)}[^"']*["'][^>]*name=["']${metaName}["'])[^>]*>`,
    'i'
  );
};

export function expectMetaDescriptionContains(html: string, fragment: string): void {
  expect(extractHeadHtml(html)).toMatch(buildMetaTagPattern('description', fragment));
}

export function expectHeadDoesNotContain(html: string, fragment: string): void {
  expect(extractHeadHtml(html)).not.toContain(fragment);
}

export function expectRobotsNoindex(html: string): void {
  expect(extractHeadHtml(html)).toMatch(
    /<meta[^>]*(?:name=["']robots["'][^>]*content=["'][^"']*noindex|content=["'][^"']*noindex[^"']*["'][^>]*name=["']robots["'])[^>]*>/i
  );
}

export function expectRobotsIndexable(html: string): void {
  expect(extractHeadHtml(html)).not.toMatch(
    /<meta[^>]*(?:name=["']robots["'][^>]*content=["'][^"']*noindex|content=["'][^"']*noindex[^"']*["'][^>]*name=["']robots["'])[^>]*>/i
  );
}

export function expectTitleContains(html: string, fragment: string): void {
  const titleMatch = extractHeadHtml(html).match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  expect(titleMatch).toBeTruthy();

  const titleContent = titleMatch?.[1] ?? '';
  const htmlEntityFragment = fragment
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  expect(titleContent.includes(fragment) || titleContent.includes(htmlEntityFragment)).toBeTruthy();
}

export function expectCanonical(html: string, url: string): void {
  expect(extractHeadHtml(html)).toMatch(
    new RegExp(
      `<link[^>]*(?:rel=["']canonical["'][^>]*href=["']${escapeRegExp(url)}|href=["']${escapeRegExp(url)}["'][^>]*rel=["']canonical["'])[^>]*>`,
      'i'
    )
  );
}

export function expectHeadDoesNotContainCanonicalHref(html: string, href: string): void {
  expect(extractHeadHtml(html)).not.toContain(href);
}

export function expectHeadContainsCanonicalLink(html: string): void {
  expect(extractHeadHtml(html)).toContain('<link rel="canonical"');
}
