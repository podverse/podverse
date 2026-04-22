import type { NextRequest } from 'next/server';

import { getClientIpFromProxyHeaders } from './clientIpFromProxyHeaders';
import { PROXY } from './constants';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory rate limit storage
const rateLimitMap = new Map<string, RateLimitEntry>();

// Track last cleanup time for periodic cleanup
let lastCleanupTime = Date.now();
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Performs lazy cleanup of expired rate limit entries
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();

  // Only cleanup if enough time has passed since last cleanup
  if (now - lastCleanupTime < CLEANUP_INTERVAL_MS) {
    return;
  }

  lastCleanupTime = now;

  // Remove expired entries
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now >= entry.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}

/**
 * Extracts the client IP address from the request, handling X-Forwarded-For headers
 */
function getClientIP(req: NextRequest): string {
  return getClientIpFromProxyHeaders({
    forwardedFor: req.headers.get('x-forwarded-for'),
    realIp: req.headers.get('x-real-ip'),
  });
}

/**
 * Checks if the request should be rate limited
 * @returns { allowed: boolean, remaining: number, resetTime: number } or null if allowed
 */
export function checkRateLimit(req: NextRequest): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
} {
  // Perform lazy cleanup of expired entries
  cleanupExpiredEntries();

  const ip = getClientIP(req);
  const now = Date.now();

  let entry = rateLimitMap.get(ip);

  // If entry doesn't exist or has expired, create a new one
  if (!entry || now >= entry.resetTime) {
    entry = {
      count: 0,
      resetTime: now + PROXY.RATE_LIMIT.WINDOW_MS,
    };
    rateLimitMap.set(ip, entry);
  }

  // Increment count
  entry.count++;

  // Check if limit exceeded
  if (entry.count > PROXY.RATE_LIMIT.MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  return {
    allowed: true,
    remaining: PROXY.RATE_LIMIT.MAX_REQUESTS - entry.count,
    resetTime: entry.resetTime,
  };
}
