import type { Page, Route } from '@playwright/test';
import { expect } from '@playwright/test';

import type { AddByRSSParseCacheEntry } from '@podverse/helpers';

export const E2E_API_BASE_URL = 'http://localhost:4030/api/v2';

const LOGIN_EMAIL = 'e2e-user@example.com';
const LOGIN_PASSWORD = 'Test!1Aa';

/** test-assets gates every path under `/basic-auth/` behind these credentials. */
export const E2E_BASIC_AUTH_USERNAME = 'username';
export const E2E_BASIC_AUTH_PASSWORD = 'password';
const E2E_BASIC_AUTH_FEED_URL = 'http://localhost:2111/basic-auth/feeds/feed-basic-auth.rss';
export const E2E_BASIC_AUTH_AUDIO_URL = 'http://localhost:2111/basic-auth/audio/audio-001.mp3';

/**
 * A distinct protected feed URL per spec. Follows persist on the seeded account across specs,
 * so each spec follows its own URL and unfollows it afterwards.
 */
export const buildE2eProtectedFeedUrl = (label: string): string =>
  `${E2E_BASIC_AUTH_FEED_URL}?e2e=${label}`;

export async function loginSeedUser(page: Page): Promise<void> {
  const response = await page.request.post(`${E2E_API_BASE_URL}/auth/login`, {
    data: { email: LOGIN_EMAIL, password: LOGIN_PASSWORD },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
}

export async function followFeedOnServer(
  page: Page,
  params: { feedUrl: string; title: string; requiresCredentials: boolean }
): Promise<void> {
  const response = await page.request.post(`${E2E_API_BASE_URL}/account/follow/add-by-rss-channel`, {
    data: {
      feed_url: params.feedUrl,
      title: params.title,
      requires_credentials: params.requiresCredentials,
    },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
}

/** Best-effort cleanup; a spec that failed before following leaves nothing to remove. */
export async function unfollowFeedOnServer(page: Page, feedUrl: string): Promise<void> {
  await page.request.post(`${E2E_API_BASE_URL}/account/unfollow/add-by-rss-channel`, {
    data: { feed_url: feedUrl },
  });
}

type StubbedParseOutcome = Pick<
  AddByRSSParseCacheEntry<never>,
  'status' | 'failureReason' | 'credentialsState' | 'httpStatus' | 'authChallenge'
>;

export type StubbedParseRequests = {
  /** JSON bodies sent to `POST /account/add-by-rss/parse`, in order. */
  enqueueBodies: Record<string, unknown>[];
};

const REQUEST_ID_PREFIX = 'e2e-credentials-';

const corsHeaders = (route: Route): Record<string, string> => ({
  'Access-Control-Allow-Origin': route.request().headers()['origin'] ?? 'http://localhost:4032',
  'Access-Control-Allow-Credentials': 'true',
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Stands in for the parse queue, which the web E2E stack does not run (no broker or workers).
 * The Nth enqueue resolves to the Nth outcome (the last outcome repeats). Parsed outcomes carry
 * no payload, so the feed keeps its URL as its title.
 */
export async function stubAddByRSSParse(
  page: Page,
  outcomes: StubbedParseOutcome[]
): Promise<StubbedParseRequests> {
  const enqueueBodies: Record<string, unknown>[] = [];

  await page.route('**/account/add-by-rss/parse', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    const body: unknown = route.request().postDataJSON();
    enqueueBodies.push(isRecord(body) ? body : {});
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      headers: corsHeaders(route),
      body: JSON.stringify({ request_id: `${REQUEST_ID_PREFIX}${enqueueBodies.length - 1}` }),
    });
  });

  await page.route('**/account/add-by-rss/parse/status/*', async (route) => {
    const requestId = new URL(route.request().url()).pathname.split('/').pop() ?? '';
    const index = Number.parseInt(requestId.replace(REQUEST_ID_PREFIX, ''), 10);
    const outcome = outcomes[Math.min(Number.isFinite(index) ? index : 0, outcomes.length - 1)];
    const feedUrl = enqueueBodies[index]?.['feed_url'];
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: corsHeaders(route),
      body: JSON.stringify({
        requestId,
        feedUrl: typeof feedUrl === 'string' ? feedUrl : '',
        updatedAt: new Date().toISOString(),
        ...outcome,
      }),
    });
  });

  return { enqueueBodies };
}

/** The local feed idText behind a row in the needs-credentials section. */
export async function readNeedsCredentialsFeedIdText(
  page: Page,
  feedTitle: string
): Promise<string> {
  const link = page
    .getByTestId('add-by-rss-needs-credentials-section')
    .getByRole('link', { name: new RegExp(feedTitle) });
  await expect(link).toBeVisible({ timeout: 15_000 });
  const href = (await link.getAttribute('href')) ?? '';
  const idText = href.split('/').pop() ?? '';
  expect(idText, `needs-credentials link href: ${href}`).not.toBe('');
  return idText;
}
