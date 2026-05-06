import type { NextRequest } from 'next/server';

import { isEnvLogLevelDebug, truncateForLog } from '@podverse/helpers';
import { fetchWithTimeout } from '@podverse/helpers-backend';

import { getConfig } from '../../../config';
import { PROXY } from '../../../utils/proxy/constants';
import { checkRateLimit } from '../../../utils/proxy/rateLimiter';
import { validateProxyUrl } from '../../../utils/proxy/urlValidator';

/** Only when `LOG_LEVEL=debug` on the Next server (same convention as apps/api; see `isEnvLogLevelDebug` in helpers). */
const logProxyFailureDiagnostics = (message: string, details?: Record<string, unknown>): void => {
  if (!isEnvLogLevelDebug()) {
    return;
  }
  if (details !== undefined) {
    console.warn(`[api/proxy] ${message}`, details);
  } else {
    console.warn(`[api/proxy] ${message}`);
  }
};

export async function GET(req: NextRequest) {
  const config = getConfig();
  // Rate limiting check
  const rateLimitResult = checkRateLimit(req);
  if (!rateLimitResult.allowed) {
    return new Response('Rate limit exceeded', {
      status: 429,
      headers: {
        'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
        'X-RateLimit-Limit': '1000',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
      },
    });
  }

  // Extract URL from query parameters
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');

  if (!url) {
    logProxyFailureDiagnostics('missing url parameter');
    return new Response('Missing url parameter', { status: 400 });
  }

  // Validate URL and check for SSRF vulnerabilities
  const urlValidation = validateProxyUrl(url);
  if (!urlValidation.isValid) {
    logProxyFailureDiagnostics('invalid URL', {
      url: truncateForLog(url, 512),
      error: urlValidation.error,
    });
    return new Response(`Invalid URL: ${urlValidation.error}`, { status: 400 });
  }

  try {
    const response = await fetchWithTimeout(url, {
      headers: {
        'User-Agent': config.proxy.userAgent,
      },
      timeoutMs: PROXY.TIMEOUT_MS,
    });

    if (!response.ok) {
      logProxyFailureDiagnostics('upstream fetch not ok', {
        url: truncateForLog(url, 512),
        status: response.status,
      });
      return new Response('Image fetch failed', { status: response.status });
    }

    // Validate Content-Type
    const contentType = response.headers.get('content-type');
    if (!contentType) {
      logProxyFailureDiagnostics('missing Content-Type', { url: truncateForLog(url, 512) });
      return new Response('Missing Content-Type header', { status: 400 });
    }

    // Check if Content-Type is an allowed image type
    const contentTypeParts = contentType.toLowerCase().split(';');
    const contentTypeLower = contentTypeParts[0];
    if (!contentTypeLower) {
      logProxyFailureDiagnostics('invalid Content-Type header shape', {
        url: truncateForLog(url, 512),
      });
      return new Response('Invalid Content-Type header', { status: 400 });
    }
    const isAllowedType = PROXY.ALLOWED_CONTENT_TYPES.some((allowedType) => {
      const allowed = allowedType.toLowerCase();
      const actual = contentTypeLower.trim();
      if (allowed.endsWith('/*')) {
        return actual.startsWith(allowed.slice(0, -1)); // e.g. 'image/' prefix matches 'image/*'
      }
      return actual === allowed;
    });

    if (!isAllowedType) {
      logProxyFailureDiagnostics('content-type not allowed', {
        url: truncateForLog(url, 512),
        contentType,
      });
      return new Response(`Content-Type not allowed: ${contentType}`, { status: 403 });
    }

    // Stream response with size checking
    const reader = response.body?.getReader();
    if (!reader) {
      logProxyFailureDiagnostics('no response body', { url: truncateForLog(url, 512) });
      return new Response('No response body', { status: 500 });
    }

    const chunks: Uint8Array[] = [];
    let totalSize = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        if (value) {
          totalSize += value.length;

          // Check size limit
          if (totalSize > PROXY.SIZE_LIMITS.MAX_RESPONSE_SIZE_BYTES) {
            reader.cancel();
            logProxyFailureDiagnostics('response too large', {
              url: truncateForLog(url, 512),
              maxBytes: PROXY.SIZE_LIMITS.MAX_RESPONSE_SIZE_BYTES,
            });
            return new Response('Response too large', {
              status: 413,
              headers: {
                'X-Max-Size': PROXY.SIZE_LIMITS.MAX_RESPONSE_SIZE_BYTES.toString(),
              },
            });
          }

          chunks.push(value);
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Combine chunks into single buffer
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    // Return response with rate limit headers
    return new Response(Buffer.from(combined), {
      headers: {
        'Cache-Control': `public, max-age=${config.proxy.responseCacheMaxAgeSeconds}, s-maxage=${config.proxy.responseCacheMaxAgeSeconds}`,
        'Content-Type': contentType,
        'X-RateLimit-Limit': '1000',
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      logProxyFailureDiagnostics('request timeout', { url: truncateForLog(url, 512) });
      return new Response('Request timeout', { status: 504 });
    }
    const err = error instanceof Error ? error : new Error(String(error));
    logProxyFailureDiagnostics('fetch error', {
      url: truncateForLog(url, 512),
      errorName: err.name,
      errorMessage: truncateForLog(err.message, 512),
    });
    return new Response('Image fetch failed', { status: 500 });
  }
}
