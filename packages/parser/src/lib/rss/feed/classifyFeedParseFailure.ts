import type { FeedParseFailureReason } from '@podverse/helpers';
import { getStatusCodeFromError, isTlsOrProtocolError } from '@podverse/helpers-requests';

import { FeedNotAFeedError, FeedResponseTruncatedError } from '../errors.js';

const CAUSE_WALK_LIMIT = 3;

const DNS_CODES = new Set(['ENOTFOUND', 'EAI_AGAIN']);
const TIMEOUT_CODES = new Set([
  'ETIMEDOUT',
  'ECONNABORTED',
  'ERR_CANCELED',
  'ABORT_ERR',
  'UND_ERR_ABORTED',
]);
const CONNECTION_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'EPIPE',
]);
const XML_VALIDATOR_CODES = new Set(['InvalidTag', 'InvalidAttr', 'InvalidChar', 'InvalidXml']);
const ZLIB_CUT_OFF_CODES = new Set(['Z_DATA_ERROR', 'Z_BUF_ERROR']);

/**
 * Classifies a feed parse failure.
 * `no_feed_url` is stored for a migration feed that has no URL and is never returned here.
 */
export function classifyFeedParseFailure(error: unknown): FeedParseFailureReason {
  if (someNode(error, isMaxResponseSizeError)) {
    return 'body_too_large';
  }

  const status = readFeedParseHttpStatus(error);
  const statusReason = reasonForHttpStatus(status);
  if (statusReason !== null) {
    return statusReason;
  }

  if (someNode(error, isTruncatedResponse)) {
    return 'response_truncated';
  }

  const networkReason = firstReason(error, reasonForNetworkCode);
  if (networkReason !== null) {
    return networkReason;
  }

  if (someNode(error, isTlsFailure)) {
    return 'tls_error';
  }

  const databaseReason = firstReason(error, reasonForPostgres);
  if (databaseReason !== null) {
    return databaseReason;
  }

  if (someNode(error, isNotAFeedFailure)) {
    return 'not_a_feed';
  }

  if (error instanceof Error) {
    return 'parse_error';
  }

  return 'unknown';
}

/** HTTP status on the error, an axios-style `response.status`, or a cause up to three levels. */
export function readFeedParseHttpStatus(error: unknown): number | null {
  let found: number | null = null;
  eachNode(error, (node) => {
    if (found !== null) {
      return;
    }
    const status = readOwnHttpStatus(node);
    if (status !== null) {
      found = status;
    }
  });
  return found;
}

export function isMaxResponseSizeError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes('maxcontentlength') ||
    message.includes('maxbodylength') ||
    message.includes('response body exceeds max')
  );
}

function isTruncatedResponse(node: unknown): boolean {
  if (
    node instanceof FeedResponseTruncatedError ||
    readString(node, 'name') === 'FeedResponseTruncatedError'
  ) {
    return true;
  }
  const code = readString(node, 'code');
  if (code !== null && ZLIB_CUT_OFF_CODES.has(code)) {
    return true;
  }
  if (!(node instanceof Error)) {
    return false;
  }
  const message = node.message.toLowerCase();
  return (
    message.includes('too many length or distance symbols') ||
    message.includes('unexpected end of file')
  );
}

function reasonForHttpStatus(status: number | null): FeedParseFailureReason | null {
  if (status === null) {
    return null;
  }
  if (status === 404) {
    return 'http_404';
  }
  if (status === 410) {
    return 'http_410';
  }
  if (status === 403) {
    return 'http_403';
  }
  if (status >= 400 && status < 500) {
    return 'http_4xx';
  }
  if (status >= 500 && status < 600) {
    return 'http_5xx';
  }
  return null;
}

function reasonForNetworkCode(node: unknown): FeedParseFailureReason | null {
  const name = readString(node, 'name');
  if (name === 'AbortError' || name === 'CanceledError' || name === 'CancelError') {
    return 'timeout';
  }

  const code = readString(node, 'code');
  if (code === null) {
    return null;
  }
  if (DNS_CODES.has(code)) {
    return 'dns_not_found';
  }
  if (TIMEOUT_CODES.has(code) || /^UND_ERR_.*_TIMEOUT$/.test(code)) {
    return 'timeout';
  }
  if (CONNECTION_CODES.has(code)) {
    return 'connection_error';
  }
  return null;
}

function isTlsFailure(node: unknown): boolean {
  if (isTlsOrProtocolError(node)) {
    return true;
  }
  const code = readString(node, 'code');
  if (code === null) {
    return false;
  }
  return code.startsWith('CERT_') || code.startsWith('ERR_TLS_') || code.startsWith('ERR_SSL_');
}

function reasonForPostgres(node: unknown): FeedParseFailureReason | null {
  if (!isPostgresFailure(node)) {
    return null;
  }
  const code = readSqlState(node);
  return code === '22003' ? 'db_value_out_of_range' : 'db_error';
}

function isPostgresFailure(node: unknown): boolean {
  if (readString(node, 'name') === 'QueryFailedError') {
    return true;
  }
  const code = readString(node, 'code');
  const routine = readString(node, 'routine');
  return code !== null && isSqlState(code) && routine !== null;
}

function readSqlState(node: unknown): string | null {
  const own = readString(node, 'code');
  if (own !== null && isSqlState(own)) {
    return own;
  }
  const driver = readField(node, 'driverError');
  const driverCode = readString(driver, 'code');
  if (driverCode !== null && isSqlState(driverCode)) {
    return driverCode;
  }
  return null;
}

function isSqlState(code: string): boolean {
  return /^[0-9A-Z]{5}$/.test(code);
}

function isNotAFeedFailure(node: unknown): boolean {
  if (node instanceof FeedNotAFeedError || readString(node, 'name') === 'FeedNotAFeedError') {
    return true;
  }
  const validatorCode = readString(readField(node, 'err'), 'code');
  if (validatorCode !== null && XML_VALIDATOR_CODES.has(validatorCode)) {
    return true;
  }
  if (!(node instanceof Error)) {
    return false;
  }
  return isXmlParserFailureMessage(node.message);
}

function isXmlParserFailureMessage(message: string): boolean {
  if (/:\d+:\d+$/.test(message) && /tag|attribute|char '|doctype|entity/i.test(message)) {
    return true;
  }
  return (
    message.startsWith('Unpaired tag ') ||
    message.startsWith('Invalid tag name:') ||
    message.startsWith('Unexpected end of ') ||
    message.startsWith('Pi Tag is not closed') ||
    message.startsWith('Multiple DOCTYPE') ||
    message.startsWith('Invalid DOCTYPE') ||
    message.startsWith('Unclosed DOCTYPE') ||
    message === 'Maximum nested tags exceeded'
  );
}

function readOwnHttpStatus(node: unknown): number | null {
  const direct = getStatusCodeFromError(node);
  if (typeof direct === 'number' && Number.isFinite(direct)) {
    return direct;
  }
  const response = readField(node, 'response');
  const status = readField(response, 'status');
  if (typeof status === 'number' && Number.isFinite(status)) {
    return status;
  }
  return null;
}

function someNode(error: unknown, predicate: (node: unknown) => boolean): boolean {
  let found = false;
  eachNode(error, (node) => {
    if (!found && predicate(node)) {
      found = true;
    }
  });
  return found;
}

function firstReason(
  error: unknown,
  read: (node: unknown) => FeedParseFailureReason | null
): FeedParseFailureReason | null {
  let found: FeedParseFailureReason | null = null;
  eachNode(error, (node) => {
    if (found !== null) {
      return;
    }
    found = read(node);
  });
  return found;
}

function eachNode(error: unknown, visit: (node: unknown) => void): void {
  let current: unknown = error;
  for (let depth = 0; depth <= CAUSE_WALK_LIMIT; depth += 1) {
    visit(current);
    if (typeof current !== 'object' || current === null || !Reflect.has(current, 'cause')) {
      return;
    }
    const cause: unknown = Reflect.get(current, 'cause');
    if (cause === undefined || cause === current) {
      return;
    }
    current = cause;
  }
}

function readField(value: unknown, key: string): unknown {
  if (typeof value !== 'object' || value === null || !Reflect.has(value, key)) {
    return undefined;
  }
  return Reflect.get(value, key);
}

function readString(value: unknown, key: string): string | null {
  const field = readField(value, key);
  return typeof field === 'string' && field.length > 0 ? field : null;
}
