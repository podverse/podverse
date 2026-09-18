import { handleGenericErrorResponse } from '@api/controllers/helpers/error.js';
import {
  loadManagedCopy,
  MANAGED_COPY_UPDATED_AT,
} from '@api/lib/managedCopy/managedCopyContent.js';
import type { Request, Response } from 'express';

import type { DTOManagedCopy } from '@podverse/helpers';
import { isManagedCopySlug } from '@podverse/helpers';

function getRequestedLocale(req: Request): string {
  const acceptLanguage = req.headers['accept-language'];
  if (typeof acceptLanguage !== 'string') {
    return '';
  }

  const requestedLocale = acceptLanguage.split(',')[0]?.trim() ?? '';
  return requestedLocale;
}

export class ManagedCopyController {
  static async get(req: Request, res: Response): Promise<void> {
    const slug = req.params.slug;
    if (typeof slug !== 'string' || !isManagedCopySlug(slug)) {
      res.status(404).json({ message: 'Not found' });
      return;
    }

    try {
      const requestedLocale = getRequestedLocale(req);
      const managedSlug = slug;
      const { locale, markdown } = loadManagedCopy(managedSlug, requestedLocale);
      const response: DTOManagedCopy = {
        slug: managedSlug,
        locale,
        updated_at: MANAGED_COPY_UPDATED_AT[managedSlug],
        markdown,
      };
      res.json(response);
    } catch (error) {
      handleGenericErrorResponse(res, error);
    }
  }
}
