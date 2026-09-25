import { getErrorMessage } from '@podverse/helpers/error';

import { syncEventLogRepository } from '../../data/repositories';

/**
 * Diagnostic kind written when Home's local read fails or outlives its budget.
 *
 * Not a queue job: the list is interactive cache. A hang or throw here is recorded so
 * More → Advanced → Error log can explain an empty or stale Home list.
 */
export const HOME_FEED_READ_LOG_KIND = 'home-feed-read';

/** Ceiling on a local Home read. Cache work that exceeds this is a hang, not a slow disk. */
export const HOME_FEED_READ_TIMEOUT_MS = 8000;

/** Ceiling on subscription-row badge queries. The titles can paint without them. */
export const HOME_FEED_METADATA_TIMEOUT_MS = 4000;

export const HOME_FEED_READ_TIMEOUT_CODE = 'home_feed_read_timeout';
export const HOME_FEED_METADATA_TIMEOUT_CODE = 'home_feed_metadata_timeout';
export const HOME_FEED_PREFS_TIMEOUT_CODE = 'home_feed_prefs_timeout';
export const HOME_FEED_READ_FAILED_CODE = 'home_feed_read_failed';

export class HomeFeedReadTimeoutError extends Error {
  readonly code: string;
  readonly timeoutMs: number;

  constructor(timeoutMs: number, label: string, code: string = HOME_FEED_READ_TIMEOUT_CODE) {
    super(`Home feed read "${label}" exceeded its ${timeoutMs}ms budget`);
    this.name = 'HomeFeedReadTimeoutError';
    this.code = code;
    this.timeoutMs = timeoutMs;
  }
}

export const isHomeFeedReadTimeoutError = (error: unknown): error is HomeFeedReadTimeoutError => {
  return error instanceof HomeFeedReadTimeoutError;
};

export type HomeFeedReadLogInput = {
  error: unknown;
  mediaType: string;
  source: string;
};

export const toHomeFeedReadLogAppend = (input: HomeFeedReadLogInput) => {
  const errorCode = isHomeFeedReadTimeoutError(input.error)
    ? input.error.code
    : HOME_FEED_READ_FAILED_CODE;
  const detail = getErrorMessage(input.error, errorCode);
  const message = `${input.source} ${input.mediaType}${detail === errorCode ? '' : `: ${detail}`}`;

  return {
    errorCode,
    jobKind: HOME_FEED_READ_LOG_KIND,
    message,
    occurredAt: Date.now(),
    outcome: 'failure' as const,
  };
};

/** Record a Home cache-read failure. Never throws: the list must keep painting. */
export const appendHomeFeedReadFailure = (input: HomeFeedReadLogInput): void => {
  void syncEventLogRepository.append(toHomeFeedReadLogAppend(input));
};

export const withHomeFeedReadBudget = async <T>(
  work: Promise<T>,
  timeoutMs: number,
  label: string,
  code: string = HOME_FEED_READ_TIMEOUT_CODE
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const budget = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      reject(new HomeFeedReadTimeoutError(timeoutMs, label, code));
    }, timeoutMs);
  });

  try {
    return await Promise.race([work, budget]);
  } finally {
    clearTimeout(timeoutId);
  }
};
