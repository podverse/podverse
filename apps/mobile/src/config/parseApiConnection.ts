export type MobileApiConnection = {
  baseUrl: string;
  host: string;
  port?: string;
  /** e.g. `/api` — no trailing slash */
  prefix: string;
  protocol: string;
  /** e.g. `/v2` — leading slash */
  version: string;
};

/**
 * Derive ApiRequestService fields from an absolute API base URL that includes
 * `/api/<version>` (e.g. `http://localhost:4230/api/v2`).
 *
 * Returns null when the URL is invalid or the pathname lacks `/…/api/<version>`.
 * No soft fallbacks — misconfigured env must fail validation instead of inventing paths.
 */
export const parseMobileApiConnection = (apiBaseUrl: string): MobileApiConnection | null => {
  try {
    const parsed = new URL(apiBaseUrl);
    const segments = parsed.pathname.split('/').filter(Boolean);
    const lastSegment = segments.at(-1);
    const secondToLastSegment = segments.at(-2);

    if (lastSegment === undefined || secondToLastSegment !== 'api') {
      return null;
    }

    const prefix = `/${segments.slice(0, -1).join('/')}`;
    const version = `/${lastSegment}`;

    return {
      baseUrl: apiBaseUrl,
      host: parsed.hostname,
      ...(parsed.port ? { port: parsed.port } : {}),
      prefix,
      protocol: parsed.protocol.replace(':', ''),
      version,
    };
  } catch {
    return null;
  }
};
