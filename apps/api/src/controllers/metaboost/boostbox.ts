import type { Request, Response } from 'express';
import Joi from 'joi';
import { loggerService } from '@api/factories/loggerService.js';
import { fetchWithTimeout } from '@podverse/helpers-backend';
import { uriRequireHttpsInProduction, validateBodyObject } from '@api/lib/validation/index.js';
import { config } from '@api/config/index.js';

const BOOSTBOX_LOCAL_API_KEY = 'v4v4me';

const boostBodySchema = Joi.object({
  baseUrl: uriRequireHttpsInProduction().required(),
}).unknown(true);

export class BoostboxController {
  static async boost(req: Request, res: Response): Promise<void> {
    validateBodyObject(boostBodySchema, req, res, async () => {
      const baseUrlRaw = req.body.baseUrl;
      const resolvedBaseUrl =
        config.boostbox.internalBaseUrl ?? (typeof baseUrlRaw === 'string' ? baseUrlRaw : '');
      const baseUrl = resolvedBaseUrl.replace(/\/$/, '');
      const boostPayload: Record<string, unknown> =
        typeof req.body === 'object' && req.body !== null ? { ...req.body } : {};
      delete boostPayload.baseUrl;
      const body = JSON.stringify(boostPayload);

      try {
        const response = await fetchWithTimeout(baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': BOOSTBOX_LOCAL_API_KEY,
          },
          body,
          timeoutMs: 15000,
        });

        const responseBody = await response.text();
        let jsonBody: unknown = null;
        const contentType = response.headers.get('content-type');
        if (
          contentType !== null &&
          contentType.includes('application/json') &&
          responseBody.trim() !== ''
        ) {
          try {
            jsonBody = JSON.parse(responseBody) as unknown;
          } catch {
            jsonBody = responseBody;
          }
        } else if (responseBody.trim() !== '') {
          jsonBody = responseBody;
        }

        if (response.status === 204) {
          res.status(204).end();
        } else {
          res.status(response.status).json(jsonBody !== null ? jsonBody : {});
        }
      } catch (error) {
        loggerService.logError('BoostBox proxy request failed', error as Error);
        if (!res.headersSent) {
          res.status(502).json({ message: 'BoostBox request failed' });
        }
      }
    });
  }
}
