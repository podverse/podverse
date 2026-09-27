import type { BillingWebhookRequest } from '@podverse/helpers';
import { BillingWebhookVerificationError } from '@podverse/helpers';

import type { GoogleIdTokenPayload, GoogleIdTokenVerifier } from './PlayDeveloperClient.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string): string | null {
  const value = Reflect.get(record, key);
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function readRecord(record: Record<string, unknown>, key: string): Record<string, unknown> | null {
  const value = Reflect.get(record, key);
  return isRecord(value) ? value : null;
}

function readHeader(
  headers: Readonly<Record<string, string | string[] | undefined>>,
  key: string
): string | null {
  const value = headers[key];
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'string' && item.length > 0) {
        return item;
      }
    }
  }
  return null;
}

function parseJsonObject(text: string, label: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new BillingWebhookVerificationError('google_play', `${label} is not valid JSON`);
  }
  if (!isRecord(parsed)) {
    throw new BillingWebhookVerificationError('google_play', `${label} must be a JSON object`);
  }
  return parsed;
}

function decodeRawBody(rawBody: Uint8Array | string): Record<string, unknown> {
  const text = typeof rawBody === 'string' ? rawBody : new TextDecoder().decode(rawBody);
  return parseJsonObject(text, 'RTDN request body');
}

function decodeMessageData(data: string): Record<string, unknown> {
  const decoded = Buffer.from(data, 'base64').toString('utf8');
  return parseJsonObject(decoded, 'RTDN message payload');
}

function extractBearerToken(
  headers: Readonly<Record<string, string | string[] | undefined>>
): string {
  const authorization = readHeader(headers, 'authorization');
  if (authorization === null) {
    throw new BillingWebhookVerificationError('google_play', 'Missing Authorization header');
  }
  if (!authorization.startsWith('Bearer ')) {
    throw new BillingWebhookVerificationError('google_play', 'Authorization header must use Bearer');
  }
  const token = authorization.slice('Bearer '.length).trim();
  if (token.length === 0) {
    throw new BillingWebhookVerificationError('google_play', 'Authorization bearer token is empty');
  }
  return token;
}

function verifyTokenPayloadEmail(payload: GoogleIdTokenPayload, expectedServiceAccount: string): void {
  if (payload.email !== expectedServiceAccount) {
    throw new BillingWebhookVerificationError(
      'google_play',
      'RTDN token email does not match GOOGLE_PLAY_RTDN_PUSH_SERVICE_ACCOUNT_EMAIL'
    );
  }
  if (payload.email_verified !== true) {
    throw new BillingWebhookVerificationError(
      'google_play',
      'RTDN token email must be verified by Google'
    );
  }
}

export interface ParsedRtdnPush {
  requestEnvelope: Record<string, unknown>;
  messageEnvelope: Record<string, unknown>;
  developerNotification: Record<string, unknown>;
  messageId: string;
}

export interface VerifyRtdnOptions {
  request: BillingWebhookRequest;
  idTokenVerifier: GoogleIdTokenVerifier;
  expectedAudience: string;
  expectedServiceAccountEmail: string;
  expectedPackageName: string;
}

export async function verifyAndParseRtdnPush(options: VerifyRtdnOptions): Promise<ParsedRtdnPush> {
  const bearerToken = extractBearerToken(options.request.headers);
  const loginTicket = await options.idTokenVerifier.verifyIdToken({
    idToken: bearerToken,
    audience: options.expectedAudience,
  });
  const payload = loginTicket.getPayload();
  if (payload === undefined) {
    throw new BillingWebhookVerificationError('google_play', 'RTDN token payload is missing');
  }
  verifyTokenPayloadEmail(payload, options.expectedServiceAccountEmail);

  const requestEnvelope = decodeRawBody(options.request.rawBody);
  const messageEnvelope = readRecord(requestEnvelope, 'message');
  if (messageEnvelope === null) {
    throw new BillingWebhookVerificationError('google_play', 'RTDN request body is missing message');
  }
  const messageId = readString(messageEnvelope, 'messageId') ?? 'unknown-message';
  const encodedData = readString(messageEnvelope, 'data');
  if (encodedData === null) {
    throw new BillingWebhookVerificationError('google_play', 'RTDN message is missing data');
  }

  const developerNotification = decodeMessageData(encodedData);
  const packageName = readString(developerNotification, 'packageName');
  if (packageName === null) {
    throw new BillingWebhookVerificationError('google_play', 'RTDN payload is missing packageName');
  }
  if (packageName !== options.expectedPackageName) {
    throw new BillingWebhookVerificationError(
      'google_play',
      'RTDN packageName does not match GOOGLE_PLAY_PACKAGE_NAME'
    );
  }

  return {
    requestEnvelope,
    messageEnvelope,
    developerNotification,
    messageId,
  };
}
