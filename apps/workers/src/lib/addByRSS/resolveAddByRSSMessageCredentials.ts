import type { AddByRSSParseCredentialsState } from '@podverse/helpers';
import { resolveCredentialScope } from '@podverse/helpers';
import type { AddByRssCredentialSecrets } from '@podverse/helpers-backend';
import { openAddByRssCredentials } from '@podverse/helpers-backend';

export type ResolvedAddByRSSMessageCredentials = {
  credentialsState: AddByRSSParseCredentialsState;
  /** Present only when the envelope opened and the feed URL itself is in credential scope. */
  basicAuth?: AddByRssCredentialSecrets;
};

/**
 * Opens a parse message's credentials envelope in memory and decides whether the feed request may
 * carry them. The envelope is bound to the message's accountId, requestId, and feedUrl, so an
 * envelope copied onto another message, an expired one, or one sealed with an unknown key all
 * report `decrypt_failed`.
 */
export const resolveAddByRSSMessageCredentials = ({
  accountId,
  requestId,
  feedUrl,
  credentialsEnvelope,
  keyHex,
  keyHexOld,
  allowInsecure,
  nowMs,
}: {
  accountId: number;
  requestId: string;
  feedUrl: string;
  credentialsEnvelope?: string;
  keyHex: string;
  keyHexOld?: string;
  allowInsecure: boolean;
  nowMs?: number;
}): ResolvedAddByRSSMessageCredentials => {
  if (credentialsEnvelope === undefined || credentialsEnvelope === '') {
    return { credentialsState: 'not_provided' };
  }

  const secrets = openAddByRssCredentials(
    credentialsEnvelope,
    keyHex,
    { accountId, requestId, feedUrl },
    { keyHexOld, nowMs }
  );
  if (secrets === null) {
    return { credentialsState: 'decrypt_failed' };
  }

  const decision = resolveCredentialScope(feedUrl, feedUrl, { allowInsecure });
  if (decision !== 'send') {
    return { credentialsState: decision };
  }
  return { credentialsState: 'sent', basicAuth: secrets };
};
