import dns from 'node:dns';
import net from 'node:net';

import Address from 'ipaddr.js';

const BLOCKED_HOSTNAMES = new Set(['localhost']);

export class OutboundUrlBlockedError extends Error {
  readonly code = 'OUTBOUND_URL_BLOCKED';

  constructor(message: string) {
    super(message);
    this.name = 'OutboundUrlBlockedError';
  }
}

function assertSchemeAllowed(parsed: URL): void {
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new OutboundUrlBlockedError(
      `Only http and https URLs are allowed (got ${parsed.protocol})`
    );
  }
}

function assertNoCredentials(parsed: URL): void {
  if (parsed.username !== '' || parsed.password !== '') {
    throw new OutboundUrlBlockedError('URLs with embedded credentials are not allowed');
  }
}

function isIpv6(addr: Address.IPv4 | Address.IPv6): addr is Address.IPv6 {
  return addr.kind() === 'ipv6';
}

/** Block all non–globally-routable unicast ranges (ipaddr.js v2 adds more named special ranges; allow only unicast). */
function isBlockedParsedIp(addr: Address.IPv4 | Address.IPv6): boolean {
  if (isIpv6(addr) && addr.isIPv4MappedAddress()) {
    return isBlockedParsedIp(addr.toIPv4Address());
  }

  return addr.range() !== 'unicast';
}

export function assertIpLiteralAllowed(ipString: string): void {
  let addr: Address.IPv4 | Address.IPv6;
  try {
    addr = Address.parse(ipString);
  } catch {
    throw new OutboundUrlBlockedError(`Invalid IP address: ${ipString}`);
  }

  if (isBlockedParsedIp(addr)) {
    throw new OutboundUrlBlockedError(`Blocked IP address range for outbound fetch: ${ipString}`);
  }
}

/** Sync validation for axios redirect targets.
 * IP literals and localhost use the same rules as {@link validateOutboundFetchUrl}.
 * Hostnames cannot be DNS-checked synchronously in redirect hooks (no stable sync DNS API);
 * initial requests still validate hostnames asynchronously before any bytes are sent.
 */
export function validateOutboundRedirectLocation(options: Record<string, unknown>): void {
  const href = typeof options.href === 'string' ? options.href : undefined;
  if (!href) {
    throw new OutboundUrlBlockedError('Redirect missing target URL');
  }

  let parsed: URL;
  try {
    parsed = new URL(href);
  } catch {
    throw new OutboundUrlBlockedError(`Invalid redirect URL: ${href}`);
  }

  assertSchemeAllowed(parsed);
  assertNoCredentials(parsed);

  const hostname = parsed.hostname;

  if (BLOCKED_HOSTNAMES.has(hostname.toLowerCase())) {
    throw new OutboundUrlBlockedError(`Blocked hostname for outbound redirect: ${hostname}`);
  }

  const ipVersion = net.isIP(hostname);
  if (ipVersion === 4 || ipVersion === 6) {
    assertIpLiteralAllowed(hostname);

    return;
  }
}

/**
 * Validates an absolute URL before an outbound parser/service fetch (SSRF guardrails).
 * Allows only http(s), rejects private/loopback/link-local/reserved IPs (after DNS when needed).
 */
export async function validateOutboundFetchUrl(urlString: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new OutboundUrlBlockedError(`Invalid URL: ${urlString}`);
  }

  assertSchemeAllowed(parsed);
  assertNoCredentials(parsed);

  const hostname = parsed.hostname;

  if (BLOCKED_HOSTNAMES.has(hostname.toLowerCase())) {
    throw new OutboundUrlBlockedError(`Blocked hostname for outbound fetch: ${hostname}`);
  }

  const ipVersion = net.isIP(hostname);
  if (ipVersion === 4 || ipVersion === 6) {
    assertIpLiteralAllowed(hostname);

    return;
  }

  let addresses: dns.LookupAddress[];
  try {
    addresses = await dns.promises.lookup(hostname, { all: true, verbatim: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new OutboundUrlBlockedError(
      `DNS lookup failed for outbound fetch (${hostname}): ${message}`
    );
  }

  if (addresses.length === 0) {
    throw new OutboundUrlBlockedError(`No addresses resolved for host: ${hostname}`);
  }

  for (const entry of addresses) {
    assertIpLiteralAllowed(entry.address);
  }
}
