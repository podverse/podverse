import { config } from '@api/config/index.js';
import { handleGenericErrorResponse } from '@api/controllers/helpers/error.js';
import { loadTermsMarkdown } from '@api/lib/legal/termsContent.js';
import type { Request, Response } from 'express';

import type { DTOTermsAgreement } from '@podverse/helpers';
import { getDefaultLocale } from '@podverse/orm';

function getRequestedLocale(req: Request): string {
  const acceptLanguage = req.headers['accept-language'];
  if (typeof acceptLanguage !== 'string') {
    return '';
  }
  return acceptLanguage.split(',')[0]?.trim() ?? '';
}

export class TermsLegalController {
  static async get(req: Request, res: Response): Promise<void> {
    try {
      const requestedLocale = getRequestedLocale(req);
      let locale = requestedLocale;
      if (locale === '') {
        try {
          locale = getDefaultLocale();
        } catch {
          locale = 'en-US';
        }
      }
      const markdown = loadTermsMarkdown(locale);
      const response: DTOTermsAgreement = {
        version: config.terms.version,
        markdown,
      };
      res.json(response);
    } catch (error) {
      handleGenericErrorResponse(res, error);
    }
  }
}
