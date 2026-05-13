/**
 * Normalizes a feed URL to its canonical percent-encoded HTTP(S) form.
 *
 * - Trims leading/trailing whitespace.
 * - Attempts to parse as-is; if that fails, replaces ASCII spaces with %20 and retries.
 * - Returns the canonical `parsed.href` string, or null if the URL is invalid/non-http(s).
 *
 * Use this as the single entry point for any feed URL before storage or lookup.
 */
export function canonicalHttpOrHttpsUrl(urlRaw: string): string | null {
  const trimmed = urlRaw.trim();
  if (trimmed === '') {
    return null;
  }

  const tryParse = (candidate: string): string | null => {
    try {
      const parsed = new URL(candidate);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        return null;
      }
      if (!parsed.hostname) {
        return null;
      }
      return parsed.href;
    } catch {
      return null;
    }
  };

  return tryParse(trimmed) ?? tryParse(trimmed.replace(/ /g, '%20'));
}

/**
 * Parses a trimmed string as an HTTP or HTTPS URL with a non-empty hostname.
 * Returns null if the input is not a valid http(s) URL for this contract.
 */
export function parseHttpOrHttpsUrl(urlRaw: string): URL | null {
  const trimmedUrl = urlRaw.trim();
  if (trimmedUrl === '') {
    return null;
  }

  try {
    const parsed = new URL(trimmedUrl);

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return null;
    }

    if (!parsed.hostname || parsed.hostname.length === 0) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function isValidHttpUrl(url?: string | null): true | null {
  if (!url) {
    return null;
  }
  const pattern = /^(http|https):\/\//;
  return pattern.test(url) ? true : null;
}

/**
 * Validates that a string is a valid HTTPS URL.
 * Returns an object with isValid boolean and optional error message.
 */
export function validateHttpsUrl(url?: string | null): { isValid: boolean; error?: string } {
  if (!url || url.trim() === '') {
    return { isValid: false, error: 'URL is required' };
  }

  const trimmedUrl = url.trim();

  const parsedOk = parseHttpOrHttpsUrl(trimmedUrl);
  if (parsedOk && parsedOk.protocol === 'https:') {
    return { isValid: true };
  }

  try {
    const parsed = new URL(trimmedUrl);

    if (parsed.protocol !== 'https:') {
      return { isValid: false, error: 'URL must use HTTPS' };
    }

    if (!parsed.hostname || parsed.hostname.length === 0) {
      return { isValid: false, error: 'URL must have a valid hostname' };
    }

    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Invalid URL format' };
  }
}

/**
 * Validates a URL allowing both HTTP and HTTPS.
 * Useful for development environments where HTTP might be needed.
 */
export function validateHttpOrHttpsUrl(url?: string | null): { isValid: boolean; error?: string } {
  if (!url || url.trim() === '') {
    return { isValid: false, error: 'URL is required' };
  }

  const trimmedUrl = url.trim();

  const parsedOk = parseHttpOrHttpsUrl(trimmedUrl);
  if (parsedOk) {
    return { isValid: true };
  }

  try {
    const parsed = new URL(trimmedUrl);

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return { isValid: false, error: 'URL must use HTTP or HTTPS' };
    }

    if (!parsed.hostname || parsed.hostname.length === 0) {
      return { isValid: false, error: 'URL must have a valid hostname' };
    }
  } catch {
    return { isValid: false, error: 'Invalid URL format' };
  }

  return { isValid: false, error: 'Invalid URL format' };
}

/**
 * Checks if an IP address is in a private IP range.
 * Useful for SSRF protection in any application.
 *
 * @param ip - The IP address to check (IPv4 format)
 * @returns true if the IP is in a private range, false otherwise
 */
export function isPrivateIP(ip: string): boolean {
  // IPv4 private ranges
  // 10.0.0.0/8
  if (/^10\./.test(ip)) {
    return true;
  }

  // 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) {
    return true;
  }

  // 192.168.0.0/16
  if (/^192\.168\./.test(ip)) {
    return true;
  }

  // 127.0.0.0/8 (localhost)
  if (/^127\./.test(ip)) {
    return true;
  }

  // 169.254.0.0/16 (link-local)
  if (/^169\.254\./.test(ip)) {
    return true;
  }

  return false;
}

/**
 * Checks if a hostname is a localhost variant.
 * Useful for SSRF protection in any application.
 *
 * @param hostname - The hostname to check
 * @returns true if the hostname is a localhost variant, false otherwise
 */
export function isLocalhost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return (
    lower === 'localhost' ||
    lower === '127.0.0.1' ||
    lower === '::1' ||
    lower.startsWith('127.') ||
    lower.startsWith('0.0.0.0') ||
    lower === '[::1]' ||
    lower.startsWith('[::1]') ||
    lower.startsWith('fe80:') ||
    lower.startsWith('[fe80:')
  );
}

/**
 * Validates a URL for SSRF (Server-Side Request Forgery) vulnerabilities.
 * Checks for private IPs, localhost, and dangerous protocols.
 * Useful for any application that needs to validate external URLs.
 *
 * @param url - The URL to validate
 * @param options - Optional configuration
 * @param options.allowPrivateIPs - If true, allows private IP addresses (default: false)
 * @param options.allowLocalhost - If true, allows localhost URLs (default: false)
 * @param options.allowedProtocols - Array of allowed protocols (default: ['http:', 'https:'])
 * @returns Object with isValid boolean and optional error message
 */
export function validateUrlForSSRF(
  url: string | null,
  options: {
    allowPrivateIPs?: boolean;
    allowLocalhost?: boolean;
    allowedProtocols?: string[];
  } = {}
): { isValid: boolean; error?: string } {
  if (!url) {
    return { isValid: false, error: 'URL is required' };
  }

  const {
    allowPrivateIPs = false,
    allowLocalhost = false,
    allowedProtocols = ['http:', 'https:'],
  } = options;

  try {
    const parsedUrl = new URL(url);

    // Check protocol
    if (!allowedProtocols.includes(parsedUrl.protocol)) {
      return { isValid: false, error: `Protocol ${parsedUrl.protocol} is not allowed` };
    }

    // Block file:// and data: protocols by default
    if (parsedUrl.protocol === 'file:' || parsedUrl.protocol === 'data:') {
      return { isValid: false, error: 'Invalid protocol' };
    }

    // Check for localhost variants
    if (!allowLocalhost && isLocalhost(parsedUrl.hostname)) {
      return { isValid: false, error: 'Localhost URLs are not allowed' };
    }

    // Check for private IP addresses
    if (!allowPrivateIPs) {
      // Check if hostname is an IP address
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (ipRegex.test(parsedUrl.hostname)) {
        if (isPrivateIP(parsedUrl.hostname)) {
          return { isValid: false, error: 'Private IP addresses are not allowed' };
        }
      }

      // Also check hostname string directly (in case it's not a valid IP format but still private)
      if (isPrivateIP(parsedUrl.hostname)) {
        return { isValid: false, error: 'Private IP addresses are not allowed' };
      }

      // Check for IPv6 localhost addresses
      if (parsedUrl.hostname.includes(':')) {
        if (
          parsedUrl.hostname.startsWith('::1') ||
          parsedUrl.hostname.startsWith('[::1]') ||
          parsedUrl.hostname.startsWith('fe80:') ||
          parsedUrl.hostname.startsWith('[fe80:')
        ) {
          return { isValid: false, error: 'Localhost IPv6 addresses are not allowed' };
        }
      }
    }

    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Invalid URL format' };
  }
}
