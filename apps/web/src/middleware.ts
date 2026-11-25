import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { AuthCookieName } from '@podverse/helpers/auth';
import { ONE_YEAR_SECONDS } from '@podverse/helpers/timeConstants';

import type { WebSessionRenewal } from './lib/auth/webSessionRenewal';
import {
  fetchWebSessionRenewal,
  isWebSessionRenewalDue,
  readSetCookieValue,
  replaceCookieInHeader,
} from './lib/auth/webSessionRenewal';
import { CLIP_REMOVED_REQUEST_HEADER } from './lib/clip/removedClip';
import {
  channelPathForMedium,
  channelPathForRoute,
  itemPathForRoute,
  mediumIdFromChannelBody,
  MERGE_REDIRECT_CHECKED_HEADER,
  mergeRedirectRouteFromPath,
  rewrittenLocalSettingsCookie,
  withSearch,
} from './utils/redirect/mergedIdentity';

function ssrApiBase(): string | null {
  const protocol = process.env.NEXT_PUBLIC_SSR_API_PROTOCOL?.trim();
  const host = process.env.NEXT_PUBLIC_SSR_API_HOST?.trim();
  const port = process.env.NEXT_PUBLIC_SSR_API_PORT?.trim();
  const prefix = process.env.NEXT_PUBLIC_API_PREFIX?.trim();
  const version = process.env.NEXT_PUBLIC_API_VERSION?.trim();
  if (!protocol || !host || !prefix || !version) {
    return null;
  }
  const portPart = port ? `:${port}` : '';
  return `${protocol}://${host}${portPart}${prefix.replace(/\/$/, '')}${version}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringField(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function idMove(value: unknown): { fromIdText: string; toIdText: string } | null {
  if (!isRecord(value)) {
    return null;
  }
  const fromIdText = stringField(value, 'from_id_text');
  const toIdText = stringField(value, 'to_id_text');
  if (fromIdText === null || toIdText === null) {
    return null;
  }
  return { fromIdText, toIdText };
}

function podcastIndexMove(value: unknown): { toIdText: string } | null {
  if (!isRecord(value)) {
    return null;
  }
  const toIdText = stringField(value, 'to_channel_id_text');
  return toIdText === null ? null : { toIdText };
}

function firstRow(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : undefined;
}

async function postResolve(
  base: string,
  body: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(`${base}/identity/resolve`, {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) {
      return null;
    }
    const payload: unknown = await response.json();
    return isRecord(payload) ? payload : null;
  } catch {
    return null;
  }
}

async function mediumIdForChannel(base: string, idText: string): Promise<number | null> {
  try {
    const response = await fetch(`${base}/channel/${encodeURIComponent(idText)}`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) {
      return null;
    }
    const payload: unknown = await response.json();
    return mediumIdFromChannelBody(payload);
  } catch {
    return null;
  }
}

function clipIdFromPath(pathname: string): string | null {
  const match = /^\/clip\/([^/]+)$/.exec(pathname);
  if (match === null || match[1] === undefined || match[1].length === 0) {
    return null;
  }
  return match[1];
}

/** A visitor request for a removed clip is 410. The page still renders the removed shell. */
async function visitorClipRemoved(request: NextRequest, cookie: string | null): Promise<boolean> {
  const clipId = clipIdFromPath(request.nextUrl.pathname);
  if (clipId === null) {
    return false;
  }
  const base = ssrApiBase();
  if (base === null) {
    return false;
  }
  try {
    const headers: Record<string, string> = { accept: 'application/json' };
    if (cookie) {
      headers.cookie = cookie;
    }
    const response = await fetch(`${base}/clip/${encodeURIComponent(clipId)}`, {
      headers,
      signal: AbortSignal.timeout(4000),
    });
    if (response.status !== 410) {
      return false;
    }
    const payload: unknown = await response.json();
    return isRecord(payload) && payload.removed === true;
  } catch {
    return false;
  }
}

/** Signed in when a renewal issued a token, or the request still carries one that was not cleared. */
function authCookiePresent(request: NextRequest, renewal: WebSessionRenewal | null): boolean {
  if (renewal?.renewedToken) {
    return true;
  }
  const cleared =
    renewal !== null &&
    renewal.setCookies.some((cookie) => cookie.startsWith(`${AuthCookieName}=`)) &&
    readSetCookieValue(renewal.setCookies, AuthCookieName) === null;
  if (cleared) {
    return false;
  }
  const value = request.cookies.get(AuthCookieName)?.value;
  return value !== undefined && value.length > 0;
}

function passThrough(requestHeaders: Headers): NextResponse {
  const headers = new Headers(requestHeaders);
  headers.set(MERGE_REDIRECT_CHECKED_HEADER, '1');
  return NextResponse.next({ request: { headers } });
}

/** Asks the API only when the cookie is due; prefetches wait for the navigation that follows. */
async function sessionRenewalForRequest(request: NextRequest): Promise<WebSessionRenewal | null> {
  const token = request.cookies.get(AuthCookieName)?.value;
  if (!token || request.headers.get('next-router-prefetch') === '1') {
    return null;
  }
  const base = ssrApiBase();
  if (base === null || !isWebSessionRenewalDue(token, Date.now())) {
    return null;
  }
  return fetchWebSessionRenewal({
    apiBase: base,
    cookieHeader: request.headers.get('cookie') ?? '',
  });
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const renewal = await sessionRenewalForRequest(request);

  // A cleared cookie is forwarded, but the request keeps the ended token so the layout's own
  // call receives the signed-out reason.
  const requestHeaders = new Headers(request.headers);
  if (renewal?.renewedToken) {
    requestHeaders.set(
      'cookie',
      replaceCookieInHeader(
        request.headers.get('cookie') ?? '',
        AuthCookieName,
        renewal.renewedToken
      )
    );
  }

  const withRenewal = (response: NextResponse): NextResponse => {
    for (const setCookie of renewal?.setCookies ?? []) {
      response.headers.append('set-cookie', setCookie);
    }
    return response;
  };

  if (request.nextUrl.pathname === '/' && !authCookiePresent(request, renewal)) {
    return withRenewal(NextResponse.redirect(new URL('/browse', request.url), 307));
  }

  if (await visitorClipRemoved(request, requestHeaders.get('cookie'))) {
    const clipRemovedHeaders = new Headers(requestHeaders);
    clipRemovedHeaders.set(CLIP_REMOVED_REQUEST_HEADER, '1');
    return withRenewal(
      NextResponse.next({
        status: 410,
        request: { headers: clipRemovedHeaders },
      })
    );
  }

  const route = mergeRedirectRouteFromPath(request.nextUrl.pathname);
  if (route === null) {
    return withRenewal(NextResponse.next({ request: { headers: requestHeaders } }));
  }
  const base = ssrApiBase();
  if (base === null) {
    return withRenewal(NextResponse.next({ request: { headers: requestHeaders } }));
  }

  const resolved =
    route.kind === 'channel'
      ? await postResolve(base, { channel_id_texts: [route.id] })
      : route.kind === 'item'
        ? await postResolve(base, { item_id_texts: [route.id] })
        : await postResolve(base, { podcast_index_ids: [Number(route.id)] });
  if (resolved === null) {
    return withRenewal(NextResponse.next({ request: { headers: requestHeaders } }));
  }

  const search = route.kind === 'podcast_index' ? '' : request.nextUrl.search;
  let path: string | null = null;
  let cookie: string | null = null;

  if (route.kind === 'item') {
    const move = idMove(firstRow(resolved.items));
    if (move) {
      path = withSearch(itemPathForRoute(route.routeKind, move.toIdText), search);
      cookie = rewrittenLocalSettingsCookie(
        request.cookies.get('local-settings')?.value,
        'item',
        move.fromIdText,
        move.toIdText
      );
    }
  } else if (route.kind === 'podcast_index') {
    const move = podcastIndexMove(firstRow(resolved.podcast_index_ids));
    if (move) {
      const mediumId = await mediumIdForChannel(base, move.toIdText);
      path =
        mediumId === null
          ? channelPathForRoute('podcast', move.toIdText)
          : channelPathForMedium(mediumId, move.toIdText);
    }
  } else {
    const move = idMove(firstRow(resolved.channels));
    if (move) {
      const mediumId = await mediumIdForChannel(base, move.toIdText);
      path = withSearch(
        mediumId === null
          ? channelPathForRoute(route.routeKind, move.toIdText)
          : channelPathForMedium(mediumId, move.toIdText),
        search
      );
      cookie = rewrittenLocalSettingsCookie(
        request.cookies.get('local-settings')?.value,
        'channel',
        move.fromIdText,
        move.toIdText
      );
    }
  }

  if (path === null) {
    return withRenewal(passThrough(requestHeaders));
  }

  const destination = new URL(path, request.url);
  const current = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  if (`${destination.pathname}${destination.search}` === current) {
    return withRenewal(passThrough(requestHeaders));
  }

  const response = NextResponse.redirect(destination, 308);
  if (cookie !== null) {
    response.cookies.set('local-settings', cookie, {
      path: '/',
      maxAge: ONE_YEAR_SECONDS,
      sameSite: 'lax',
    });
  }
  // `response.cookies.set` rewrites every Set-Cookie header, so the renewal is appended after it.
  return withRenewal(response);
}

/** Every page route; route handlers, build assets, and files with an extension stay out. */
export const config = {
  matcher: ['/((?!api/|_next/static|_next/image|.*\\.[a-zA-Z0-9]+$).*)'],
};
