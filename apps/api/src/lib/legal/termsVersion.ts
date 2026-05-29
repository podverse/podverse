import { config } from '@api/config/index.js';
import type { Response } from 'express';

export const TERMS_VERSION_MAX_LENGTH = 64;

export function isConfiguredTermsVersion(termsVersion: string): boolean {
  return termsVersion === config.terms.version;
}

export function sendInvalidTermsVersionResponse(res: Response): void {
  res.status(400).json({ message: 'Invalid terms version' });
}
