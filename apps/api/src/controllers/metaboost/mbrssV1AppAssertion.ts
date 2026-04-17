import { randomUUID } from 'node:crypto';

import { rateLimitAuthEndpoint } from '@api/lib/rateLimiter.js';
import type { Request, Response } from 'express';
import Joi from 'joi';
import {
  APP_ASSERTION_MAX_TTL_SECONDS,
  buildSignedRequestHeaders,
  createAssertionClaims,
  hashRequestBody,
  signAppAssertion,
} from 'metaboost-signing';

import { getOwnPropertyValue, isObjectLike } from '@podverse/helpers';
import { normalizeMetaboostMbrssV1IngestNodeUrl } from '@podverse/v4v-metaboost';

const mintBodySchema = Joi.object({
  ingest_url: Joi.string().uri().required(),
  body_json: Joi.string().min(2).required(),
});

const getSigningKeyPem = (): string | null => {
  const raw = process.env.METABOOST_SIGNING_KEY_PEM;
  if (raw === undefined || raw.trim() === '') {
    return null;
  }
  return raw.replace(/\\n/g, '\n').trim();
};

const getAppAssertionIss = (): string | null => {
  const raw = process.env.METABOOST_APP_ASSERTION_ISS;
  if (raw === undefined || raw.trim() === '') {
    return null;
  }
  return raw.trim();
};

const metaboostMintUnavailableMessage = (
  privateKeyPem: string | null,
  iss: string | null
): string => {
  const missing: string[] = [];
  if (privateKeyPem === null) {
    missing.push('METABOOST_SIGNING_KEY_PEM');
  }
  if (iss === null) {
    missing.push('METABOOST_APP_ASSERTION_ISS');
  }
  const vars = missing.length === 1 ? missing[0] : `${missing[0]} and ${missing[1]}`;
  return `Metaboost integration is not configured on this server. Set ${vars} (register the matching public key in metaboost-registry for that app id).`;
};

const assertMbrssV1IngestPayload = (parsed: unknown): void => {
  if (!isObjectLike(parsed)) {
    throw new Error('body_json must be a JSON object');
  }
  const senderGuid = getOwnPropertyValue(parsed, 'sender_guid');
  if (typeof senderGuid !== 'string' || senderGuid.trim() === '') {
    throw new Error('body_json must include sender_guid');
  }
  const currency = getOwnPropertyValue(parsed, 'currency');
  if (currency !== 'BTC') {
    throw new Error('body_json currency must be BTC for mbrss-v1');
  }
};

export class MetaboostMbrssV1AppAssertionController {
  static mintRateLimiter = rateLimitAuthEndpoint({
    windowMs: 60 * 60 * 1000,
    max: 120,
  });

  static mintAppAssertionBody = async (req: Request, res: Response): Promise<void> => {
    const privateKeyPem = getSigningKeyPem();
    const iss = getAppAssertionIss();
    if (privateKeyPem === null || iss === null) {
      res.status(503).json({
        message: metaboostMintUnavailableMessage(privateKeyPem, iss),
      });
      return;
    }

    const { error, value } = mintBodySchema.validate(req.body);
    if (error !== undefined) {
      res.status(400).json({ message: error.details[0]?.message ?? 'Validation error' });
      return;
    }

    const dto = value as { ingest_url: string; body_json: string };
    let normalizedIngestUrl: string;
    try {
      normalizedIngestUrl = normalizeMetaboostMbrssV1IngestNodeUrl(dto.ingest_url);
    } catch {
      res.status(400).json({ message: 'ingest_url is not a valid MetaBoost ingest URL' });
      return;
    }

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(dto.body_json) as unknown;
    } catch {
      res.status(400).json({ message: 'body_json must be valid JSON' });
      return;
    }

    try {
      assertMbrssV1IngestPayload(parsedBody);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid body_json';
      res.status(400).json({ message: msg });
      return;
    }

    const bodyBuffer = Buffer.from(dto.body_json, 'utf8');
    const bh = hashRequestBody(bodyBuffer);
    const ingestUrl = new URL(normalizedIngestUrl);
    const pathForClaim = ingestUrl.pathname;
    const iat = Math.floor(Date.now() / 1000);
    const ttlSeconds = 120;
    const exp = iat + ttlSeconds;
    if (ttlSeconds > APP_ASSERTION_MAX_TTL_SECONDS) {
      res.status(500).json({ message: 'Internal error: TTL exceeds assertion maximum' });
      return;
    }

    try {
      const claims = createAssertionClaims({
        iss,
        iat,
        exp,
        jti: randomUUID(),
        m: 'POST',
        p: pathForClaim,
        bh,
      });
      const jwt = await signAppAssertion({
        claims,
        privateKeyPem,
      });
      const headers = buildSignedRequestHeaders({ jwt });
      const authorization = headers.Authorization;
      if (authorization === undefined) {
        res.status(500).json({ message: 'Failed to build AppAssertion authorization header' });
        return;
      }
      res.status(200).json({
        authorization,
        ingest_url: normalizedIngestUrl,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Signing failed';
      res.status(500).json({ message: msg });
    }
  };
}
