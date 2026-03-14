import { config } from '@api/config/index.js';
import Joi from 'joi';

/**
 * Returns a Joi string schema for a URI that requires HTTPS unless SERVER_ENV
 * is "local", in which case HTTP is allowed (e.g. local Boostbox at http://localhost:8080).
 */
export function uriRequireHttpsInProduction(): Joi.StringSchema {
  const schemes = config.serverEnv === 'local' ? ['http', 'https'] : ['https'];
  return Joi.string().uri({ scheme: schemes });
}
