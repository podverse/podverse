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

export type OutboundAddress = {
  address: string;
  family: 4 | 6;
};

/** Normalized host plus the addresses the guard accepted for it. */
export type OutboundConnectionTarget = {
  href: string;
  hostname: string;
  addresses: readonly OutboundAddress[];
};

/** Hostname key shared by URL parsing and the socket lookup. */
export function outboundHostKey(hostname: string): string {
  const bare =
    hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname;
  const withoutDot = bare.endsWith('.') ? bare.slice(0, -1) : bare;
  return withoutDot.toLowerCase();
}

function parseOutboundUrl(urlString: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new OutboundUrlBlockedError(`Invalid URL: ${urlString}`);
  }
  assertSchemeAllowed(parsed);
  assertNoCredentials(parsed);
  return parsed;
}

function literalAddress(ip: string): OutboundAddress {
  assertIpLiteralAllowed(ip);
  const version = net.isIP(ip);
  if (version === 6) {
    return { address: ip, family: 6 };
  }
  if (version === 4) {
    return { address: ip, family: 4 };
  }
  throw new OutboundUrlBlockedError(`Invalid IP address: ${ip}`);
}

/**
 * Resolves one host. Every returned address is one the guard accepted.
 * A later socket lookup for this host must reuse these addresses.
 */
export async function resolveOutboundHostname(
  hostname: string
): Promise<readonly OutboundAddress[]> {
  const key = outboundHostKey(hostname);
  if (key === '' || BLOCKED_HOSTNAMES.has(key)) {
    throw new OutboundUrlBlockedError(`Blocked hostname for outbound fetch: ${hostname}`);
  }

  const ipVersion = net.isIP(key);
  if (ipVersion === 4 || ipVersion === 6) {
    return [literalAddress(key)];
  }

  let lookedUp: dns.LookupAddress[];
  try {
    lookedUp = await dns.promises.lookup(key, { all: true, verbatim: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new OutboundUrlBlockedError(`DNS lookup failed for outbound fetch (${key}): ${message}`);
  }

  if (lookedUp.length === 0) {
    throw new OutboundUrlBlockedError(`No addresses resolved for host: ${key}`);
  }

  const addresses: OutboundAddress[] = [];
  for (const entry of lookedUp) {
    const family = entry.family === 4 ? 4 : entry.family === 6 ? 6 : undefined;
    if (family === undefined) {
      throw new OutboundUrlBlockedError(
        `Unsupported address family for outbound fetch: ${entry.address}`
      );
    }
    assertIpLiteralAllowed(entry.address);
    addresses.push({ address: entry.address, family });
  }
  return addresses;
}

/**
 * One lookup for an absolute URL. The connection uses {@link OutboundConnectionTarget.addresses}.
 * The Host header and TLS server name stay {@link OutboundConnectionTarget.hostname}.
 */
export async function resolveOutboundFetchTarget(
  urlString: string
): Promise<OutboundConnectionTarget> {
  const parsed = parseOutboundUrl(urlString);
  const hostname = outboundHostKey(parsed.hostname);
  const addresses = await resolveOutboundHostname(hostname);
  return { href: parsed.href, hostname, addresses };
}

/**
 * Scheme, credentials, blocked names, and IP literals for a redirect target.
 * The socket connects only to an address the outbound guard accepted, including
 * when the redirect names a new host.
 */
export function validateOutboundRedirectLocation(options: Record<string, unknown>): void {
  const href = typeof options.href === 'string' ? options.href : undefined;
  if (href === undefined || href === '') {
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

  const hostname = outboundHostKey(parsed.hostname);
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new OutboundUrlBlockedError(`Blocked hostname for outbound redirect: ${hostname}`);
  }

  const ipVersion = net.isIP(hostname);
  if (ipVersion === 4 || ipVersion === 6) {
    assertIpLiteralAllowed(hostname);
  }
}

/**
 * Validates an absolute URL before an outbound fetch.
 * Allows only http(s) and addresses whose range is unicast, including after DNS.
 */
export async function validateOutboundFetchUrl(urlString: string): Promise<void> {
  await resolveOutboundFetchTarget(urlString);
}
