import { config } from '@api/config/index.js';
import Joi from 'joi';

import type { AddByRssCredentialSecrets } from '@podverse/helpers-backend';
import { sealAddByRssCredentials } from '@podverse/helpers-backend';
import {
  ADD_BY_RSS_CREDENTIAL_MAX_LENGTH,
  canonicalAddByRSSFeedUrl,
} from '@podverse/helpers-validation';

/**
 * Joi rule for one half of a Basic Auth pair. Pair it with `.and(...)` on the parent object so
 * both halves arrive together. Joi's messages name the field, never its value.
 */
export const joiAddByRssCredentialField = (): Joi.StringSchema =>
  Joi.string().min(1).max(ADD_BY_RSS_CREDENTIAL_MAX_LENGTH);

export const joiAddByRssCredentialPair = (): Joi.ObjectSchema =>
  Joi.object({
    username: joiAddByRssCredentialField().required(),
    password: joiAddByRssCredentialField().required(),
  });

/**
 * Re-keys a client `credentials_by_url` map by canonical feed URL so it matches stored follow
 * rows regardless of trailing-slash or casing differences in what the client sent.
 */
export const canonicalizeCredentialsByUrl = (
  credentialsByUrl: Record<string, AddByRssCredentialSecrets> | undefined
): Map<string, AddByRssCredentialSecrets> => {
  const result = new Map<string, AddByRssCredentialSecrets>();
  if (!credentialsByUrl) {
    return result;
  }
  for (const [rawUrl, pair] of Object.entries(credentialsByUrl)) {
    const canonicalUrl = canonicalAddByRSSFeedUrl(rawUrl);
    if (canonicalUrl !== null) {
      result.set(canonicalUrl, pair);
    }
  }
  return result;
};

/** Seals credentials for one parse request with the configured transit key. */
export const sealAddByRssCredentialsForParse = (input: {
  credentials: AddByRssCredentialSecrets;
  accountId: number;
  requestId: string;
  feedUrl: string;
}): string =>
  sealAddByRssCredentials(
    {
      username: input.credentials.username,
      password: input.credentials.password,
      accountId: input.accountId,
      requestId: input.requestId,
      feedUrl: input.feedUrl,
    },
    config.addByRss.credentialsEncryptionKey
  );

/**
 * A followed feed known to need credentials is not worth a worker round-trip when the device
 * sent none: it would only come back 401. The caller records `credentials_required` instead.
 */
export const shouldSkipParseAllEnqueue = ({
  requiresCredentials,
  hasCredentials,
}: {
  requiresCredentials: boolean;
  hasCredentials: boolean;
}): boolean => requiresCredentials && !hasCredentials;
