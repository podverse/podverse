import { getErrorMessage } from '@podverse/helpers/error';

import type { SyncEventLogAppend } from '../../data/repositories/syncEventLogRepository';
import { classifySyncError } from '../../sync/syncErrorClassification';
import { ADD_BY_RSS_ADD_LOG_KIND } from '../../sync/syncJobKinds';
import type { AddByRssPollResult } from './domain';

/**
 * Error-log rows for add-by-RSS.
 *
 * The server fetches and parses the feed from the creator's own host, so most failures here are the
 * host's: unreachable, an HTTP error, or a document that is not a feed. The row keeps the feed URL
 * and whatever the server recorded so support can show a listener exactly which address failed.
 */

export const ADD_BY_RSS_PARSE_FAILED_CODE = 'add_by_rss_parse_failed';
export const ADD_BY_RSS_PARSE_PENDING_CODE = 'add_by_rss_parse_pending';
/** The server said parsed, but the payload could not be read into episodes on this device. */
export const ADD_BY_RSS_PAYLOAD_UNMAPPED_CODE = 'add_by_rss_payload_unmapped';
/** The feed host asked for a username and password and none were sent. */
export const ADD_BY_RSS_CREDENTIALS_REQUIRED_CODE = 'add_by_rss_credentials_required';
/** The feed host refused the username and password that were sent. */
export const ADD_BY_RSS_CREDENTIALS_REJECTED_CODE = 'add_by_rss_credentials_rejected';

/** The worker records the feed host's HTTP client message, which names the status it answered. */
const HOST_STATUS_PATTERN = /status code (\d{3})/i;

const hostStatusFromServerError = (serverError: string | null): string | undefined => {
  return serverError?.match(HOST_STATUS_PATTERN)?.[1];
};

type ParseFailureInput = {
  feedUrl: string;
  jobKind: string;
  occurredAt: number;
  requestId: string;
  result: Pick<
    AddByRssPollResult,
    'credentialsState' | 'failureReason' | 'mappedFeed' | 'serverError' | 'status'
  >;
};

const parseFailureCode = (
  result: Pick<AddByRssPollResult, 'failureReason' | 'mappedFeed' | 'status'>
): string | null => {
  switch (result.status) {
    case 'failed':
      if (result.failureReason === 'credentials_required') {
        return ADD_BY_RSS_CREDENTIALS_REQUIRED_CODE;
      }
      if (result.failureReason === 'credentials_rejected') {
        return ADD_BY_RSS_CREDENTIALS_REJECTED_CODE;
      }
      return ADD_BY_RSS_PARSE_FAILED_CODE;
    case 'parsed':
      return result.mappedFeed === null ? ADD_BY_RSS_PAYLOAD_UNMAPPED_CODE : null;
    // An unchanged feed carries no payload by design; the stored episodes stay current.
    case 'not_modified':
      return null;
    default:
      return ADD_BY_RSS_PARSE_PENDING_CODE;
  }
};

/** A row for a parse that did not produce a usable feed, or null when it did. */
export const buildAddByRssParseFailureLog = ({
  feedUrl,
  jobKind,
  occurredAt,
  requestId,
  result,
}: ParseFailureInput): SyncEventLogAppend | null => {
  const errorCode = parseFailureCode(result);
  if (errorCode === null) {
    return null;
  }

  return {
    details: {
      // Whether credentials went with the feed request, or why not. Never the credentials.
      basic_auth: result.credentialsState,
      feed_url: feedUrl,
      http_status: hostStatusFromServerError(result.serverError),
      parse_status: result.status,
      request_id: requestId,
    },
    errorCode,
    jobKind,
    // The worker's classified reason stands in when the host gave no message. Neither ever carries
    // the username or password.
    message: result.serverError ?? result.failureReason ?? null,
    occurredAt,
    outcome: 'failure',
  };
};

/**
 * A row for an interactive add that threw before a parse result came back (follow, parse request,
 * or status poll). Offline is recorded as skipped, the same way the sync queue records it.
 */
export const buildAddByRssAddErrorLog = (
  error: unknown,
  feedUrl: string,
  occurredAt: number
): SyncEventLogAppend => {
  // A status here is the Podverse API's, not the feed host's, and `code` already carries it as
  // `http_<status>`. `http_status` stays reserved for the creator's host.
  const { code, isOffline } = classifySyncError(error);
  const message = getErrorMessage(error, code);
  return {
    details: { feed_url: feedUrl },
    errorCode: code,
    jobKind: ADD_BY_RSS_ADD_LOG_KIND,
    message: message === code ? null : message,
    occurredAt,
    outcome: isOffline ? 'skipped' : 'failure',
  };
};
