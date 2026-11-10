export type PushService = 'firebase' | 'webpush' | 'unifiedpush';

export type PushErrorClass = 'dead_token' | 'transient' | 'payload_or_auth';

export type PushSendAttempt = {
  target: string;
  success: boolean;
  errorCode: string | null;
  errorMessage: string | null;
};

export type PushOutcome = {
  service: PushService;
  platform: string | null;
  accepted: number;
  failed: number;
  byCode: Record<string, number>;
  /** One short provider message per error code. Tokens that appeared in the message are removed. */
  sampleMessageByCode: Record<string, string>;
  /** Registration tokens or push endpoints the provider says are gone. */
  deadTargets: string[];
};

const DEAD_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'http_404',
  'http_410',
]);

const TRANSIENT_CODES = new Set([
  'messaging/unavailable',
  'messaging/internal-error',
  'messaging/quota-exceeded',
  'messaging/server-unavailable',
  'timeout',
  'http_408',
  'http_429',
]);

const SAMPLE_MESSAGE_MAX = 180;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function classifyPushErrorCode(code: string): PushErrorClass {
  if (DEAD_TOKEN_CODES.has(code)) {
    return 'dead_token';
  }
  if (TRANSIENT_CODES.has(code)) {
    return 'transient';
  }
  if (code.startsWith('http_')) {
    const status = Number(code.slice('http_'.length));
    if (status >= 500 && status <= 599) {
      return 'transient';
    }
  }
  return 'payload_or_auth';
}

export function httpStatusErrorCode(status: number): string {
  return `http_${status}`;
}

export type ProviderSendRow = {
  success: boolean;
  endpoint: string;
  errorCode: string | null;
  errorMessage: string | null;
};

export function providerSuccess(endpoint: string): ProviderSendRow {
  return { success: true, endpoint, errorCode: null, errorMessage: null };
}

/** Status wins over the message. Timeouts are classified as transient. The body is not kept. */
export function providerFailure(
  endpoint: string,
  status: number | null,
  message: string
): ProviderSendRow {
  const timedOut = /timeout/i.test(message);
  const errorCode =
    status !== null ? httpStatusErrorCode(status) : timedOut ? 'timeout' : 'send_failed';
  const errorMessage = status !== null ? `HTTP ${status}` : message;
  return { success: false, endpoint, errorCode, errorMessage };
}

function oneLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function sampleMessage(message: string, target: string): string {
  const withoutTarget = target.length > 0 ? message.split(target).join('redacted') : message;
  return oneLine(withoutTarget).slice(0, SAMPLE_MESSAGE_MAX);
}

export function summarizePushAttempts(
  service: PushService,
  platform: string | null,
  attempts: readonly PushSendAttempt[]
): PushOutcome {
  const byCode: Record<string, number> = {};
  const sampleMessageByCode: Record<string, string> = {};
  const deadTargets: string[] = [];
  let accepted = 0;
  let failed = 0;

  for (const attempt of attempts) {
    if (attempt.success) {
      accepted += 1;
      continue;
    }
    failed += 1;
    const code = attempt.errorCode ?? 'send_failed';
    byCode[code] = (byCode[code] ?? 0) + 1;
    if (sampleMessageByCode[code] === undefined && attempt.errorMessage !== null) {
      const message = sampleMessage(attempt.errorMessage, attempt.target);
      if (message.length > 0) {
        sampleMessageByCode[code] = message;
      }
    }
    if (
      classifyPushErrorCode(code) === 'dead_token' &&
      attempt.target.length > 0 &&
      attempt.target !== 'unknown'
    ) {
      deadTargets.push(attempt.target);
    }
  }

  return {
    service,
    platform,
    accepted,
    failed,
    byCode,
    sampleMessageByCode,
    deadTargets,
  };
}

function readErrorFields(response: Record<string, unknown>): {
  errorCode: string;
  errorMessage: string | null;
} {
  const error = isRecord(response.error) ? response.error : null;
  const errorCode =
    error !== null && typeof error.code === 'string' && error.code.length > 0
      ? error.code
      : 'send_failed';
  const errorMessage =
    error !== null && typeof error.message === 'string'
      ? error.message
      : typeof response.error === 'string'
        ? response.error
        : null;
  return { errorCode, errorMessage };
}

function flattenFirebaseResponses(batches: readonly unknown[]): unknown[] {
  const responses: unknown[] = [];
  for (const batch of batches) {
    if (isRecord(batch) && Array.isArray(batch.responses)) {
      responses.push(...batch.responses);
    }
  }
  return responses;
}

/**
 * Aligns each Firebase multicast response with the token at the same index.
 * A missing response is a failure so a short batch cannot look like a full success.
 */
export function pushAttemptsFromFirebaseBatches(
  tokens: readonly string[],
  batches: readonly unknown[]
): PushSendAttempt[] {
  const responses = flattenFirebaseResponses(batches);
  const count = Math.max(tokens.length, responses.length);
  const attempts: PushSendAttempt[] = [];

  for (let index = 0; index < count; index += 1) {
    const target = tokens[index] ?? '';
    const response = responses[index];
    if (!isRecord(response)) {
      attempts.push({
        target,
        success: false,
        errorCode: 'no_provider_response',
        errorMessage: 'No provider response',
      });
      continue;
    }
    if (response.success === true) {
      attempts.push({ target, success: true, errorCode: null, errorMessage: null });
      continue;
    }
    const fields = readErrorFields(response);
    attempts.push({
      target,
      success: false,
      errorCode: fields.errorCode,
      errorMessage: fields.errorMessage,
    });
  }

  return attempts;
}

export function pushAttemptFromProviderRow(row: unknown): PushSendAttempt {
  if (!isRecord(row)) {
    return {
      target: '',
      success: false,
      errorCode: 'no_provider_response',
      errorMessage: 'No provider response',
    };
  }
  const endpoint = typeof row.endpoint === 'string' ? row.endpoint : '';
  if (row.success === true) {
    return { target: endpoint, success: true, errorCode: null, errorMessage: null };
  }
  const errorCode =
    typeof row.errorCode === 'string' && row.errorCode.length > 0 ? row.errorCode : 'send_failed';
  const errorMessage = typeof row.errorMessage === 'string' ? row.errorMessage : null;
  return { target: endpoint, success: false, errorCode, errorMessage };
}
