import { config } from '@api/config/index.js';
import Joi from 'joi';

import { canonicalHttpOrHttpsUrl } from '@podverse/helpers-validation';

/**
 * Returns a Joi string schema for a URI that requires HTTPS unless SERVER_ENV
 * is "local", in which case HTTP is allowed (e.g. local Boostbox at http://localhost:8080).
 */
export function uriRequireHttpsInProduction(): Joi.StringSchema {
  const schemes = config.serverEnv === 'local' ? ['http', 'https'] : ['https'];
  return Joi.string().uri({ scheme: schemes });
}

/**
 * Joi schema for a feed URL field. Accepts raw-space URLs (e.g. from Podcast Index)
 * and normalizes them to their canonical percent-encoded form before the handler runs.
 * Rejects anything that cannot be parsed as a valid HTTP(S) URL.
 */
export function joiFeedUrl(): Joi.StringSchema {
  return Joi.string()
    .required()
    .custom((value: string, helpers) => {
      const canonical = canonicalHttpOrHttpsUrl(value);
      if (canonical === null) {
        return helpers.error('string.uri');
      }
      return canonical;
    });
}
