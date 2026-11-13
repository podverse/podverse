import { eq } from 'drizzle-orm';

import { deriveMembershipState, evaluateFeatureAccess } from '@podverse/helpers';
import type { DTOAccount } from '@podverse/helpers/dto';
import { parseAccessDenialReason } from '@podverse/helpers-requests';

import { requestWithMobileAuthRefresh } from '../../auth/authRequestWithRefresh';
import { fetchAccountAddByRssFeedLimit } from '../../lib/addByRss/feedLimit';
import { homeFeedRefresh } from '../../lib/home/homeFeedRefresh';
import { getDb, initializeDatabase, safeJsonParse, schema } from '../db';
import { addByRssCredentialStore } from './addByRssCredentialStore';
import type { AddByRssLoginSettleMarker } from './addByRssDevicePath';
import {
  classifySignupCarryFollowError,
  mergeAddByRssLoginSettleMarker,
  parseAddByRssLoginSettleMarker,
  planAddByRssSignupCarry,
  planSignInOwnership,
} from './addByRssDevicePath';
import { addByRssRepository } from './addByRssRepository';
import { syncEventLogRepository } from './syncEventLogRepository';
import type { MobileAuthRequestContext } from './types';

const LOGIN_SETTLE_KEY = 'add_by_rss.login_settle';

const readMarker = async (): Promise<AddByRssLoginSettleMarker | null> => {
  await initializeDatabase();
  const rows = await getDb()
    .select({ value: schema.kvMeta.value })
    .from(schema.kvMeta)
    .where(eq(schema.kvMeta.key, LOGIN_SETTLE_KEY))
    .limit(1);
  const raw = rows[0]?.value;
  if (raw === null || raw === undefined) {
    return null;
  }
  return parseAddByRssLoginSettleMarker(safeJsonParse<unknown>(raw));
};

const clearMarker = async (): Promise<void> => {
  await initializeDatabase();
  await getDb().delete(schema.kvMeta).where(eq(schema.kvMeta.key, LOGIN_SETTLE_KEY));
};

/** Remember this login so the next Add by RSS refresh can settle the phone's feeds. */
export const writeAddByRssLoginSettle = async (next: AddByRssLoginSettleMarker): Promise<void> => {
  await initializeDatabase();
  const merged = mergeAddByRssLoginSettleMarker(await readMarker(), next);
  const value = JSON.stringify(merged);
  const updatedAt = Date.now();
  await getDb()
    .insert(schema.kvMeta)
    .values({ key: LOGIN_SETTLE_KEY, updatedAt, value })
    .onConflictDoUpdate({
      target: schema.kvMeta.key,
      set: { updatedAt, value },
    });
};

const afterSessionFeedsChanged = (): void => {
  homeFeedRefresh.notify();
  void import('../nativeCache/carCacheReproject')
    .then(({ reprojectLibraryIndex }) => reprojectLibraryIndex())
    .catch(() => undefined);
};

const appendCarryStoppedLog = async (error: unknown): Promise<void> => {
  await syncEventLogRepository.append({
    details: {},
    errorCode:
      parseAccessDenialReason(error) === 'limit_reached'
        ? 'add_by_rss_feed_limit_reached'
        : 'add_by_rss_membership_required',
    jobKind: 'add-by-rss-refresh',
    message: null,
    occurredAt: Date.now(),
    outcome: 'skipped',
  });
};

/**
 * Save the signed-out user's feeds onto a new account, oldest follow first, up to the account's
 * limit. Feeds past that limit that were followed at or before the account was created are
 * removed from the phone. A feed followed after sign-up stays the signed-out user's.
 */
const carrySignedOutFeedsIntoNewAccount = async (
  context: MobileAuthRequestContext,
  account: DTOAccount,
  signedUpAtMs: number | null
): Promise<'done' | 'retry'> => {
  if (!evaluateFeatureAccess('add_by_rss_add', deriveMembershipState(account)).allowed) {
    return 'done';
  }

  let limit: number | null;
  try {
    limit = await fetchAccountAddByRssFeedLimit(context);
  } catch {
    return 'retry';
  }
  if (limit === null) {
    return 'retry';
  }

  const feeds = await addByRssRepository.listSignedOutFollowedFeeds();
  const { remove, save } = planAddByRssSignupCarry({ feeds, limit, signedUpAtMs });

  if (remove.length > 0) {
    await addByRssCredentialStore.settleSignedOutCredentialsAtSignUp({
      accountIdText: account.id_text,
      removedFeedUrls: remove,
      savedFeedUrls: [],
    });
    for (const feedUrl of remove) {
      await addByRssRepository.removeFeed(feedUrl);
    }
  }

  const saveUrls = new Set(save);
  const savedNow: string[] = [];
  try {
    for (const feed of feeds) {
      if (!saveUrls.has(feed.feedUrl)) {
        continue;
      }
      try {
        await requestWithMobileAuthRefresh(context, (api) =>
          api.reqAccountFollowAddByRSSChannel({
            feed_url: feed.feedUrl,
            image_url: null,
            title: feed.title ?? feed.feedUrl,
            ...(feed.requiresCredentials ? { requires_credentials: true } : {}),
          })
        );
        savedNow.push(feed.feedUrl);
      } catch (error) {
        const outcome = classifySignupCarryFollowError(error);
        if (outcome === 'skip') {
          continue;
        }
        if (outcome === 'stop') {
          await appendCarryStoppedLog(error);
          break;
        }
        throw error;
      }
    }
  } finally {
    if (savedNow.length > 0) {
      await addByRssCredentialStore.settleSignedOutCredentialsAtSignUp({
        accountIdText: account.id_text,
        removedFeedUrls: [],
        savedFeedUrls: savedNow,
      });
      await addByRssRepository.setSignedOutOwned(savedNow, false);
    }
  }
  return 'done';
};

/**
 * Runs once after each login, from the next Add by RSS refresh. It settles which rows on the
 * phone belong to the account and which to the signed-out user, copying the signed-out username
 * and password of a feed that becomes the account's unless the account holds one here. After a
 * sign-up on this phone it carries the signed-out user's feeds into the new account.
 */
export const runAddByRssLoginSettle = async (
  context: MobileAuthRequestContext,
  account: DTOAccount
): Promise<void> => {
  const marker = await readMarker();
  if (marker === null) {
    return;
  }
  if (marker.accountIdText !== account.id_text) {
    await clearMarker();
    return;
  }

  const startedAtMs = Date.now();
  const follows = await requestWithMobileAuthRefresh(context, (api) =>
    api.reqAccountGetFollowedAddByRSSChannels({ account_id_text: account.id_text })
  );
  const { claim, release } = planSignInOwnership({
    accountFeedUrls: follows.map((follow) => follow.feed_url),
    rows: await addByRssRepository.listFollowedOwnership(),
    startedAtMs,
  });

  if (claim.length > 0) {
    await addByRssCredentialStore.copySignedOutCredentialsAtSignIn({
      accountIdText: account.id_text,
      feedUrls: claim,
    });
  }
  await addByRssRepository.setSignedOutOwned(claim, false);
  await addByRssRepository.setSignedOutOwned(release, true);

  if (marker.signup) {
    const carried = await carrySignedOutFeedsIntoNewAccount(context, account, marker.signedUpAtMs);
    if (carried === 'retry') {
      afterSessionFeedsChanged();
      return;
    }
  }

  await clearMarker();
  afterSessionFeedsChanged();
};
