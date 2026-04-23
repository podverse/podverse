/**
 * Resolve client IP from proxy headers (same semantics as Next route rate limiter).
 */
export function getClientIpFromProxyHeaders(options: {
  forwardedFor: string | null;
  realIp: string | null;
}): string {
  const forwardedFor = options.forwardedFor;
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map((ip) => ip.trim());
    return ips[0] || 'unknown';
  }

  const realIP = options.realIp;
  if (realIP) {
    return realIP;
  }

  return 'unknown';
}
