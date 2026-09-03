'use client';

import { useEffect, useState } from 'react';

import type { ChannelSeenState, ChannelUnseenBadge } from '@podverse/helpers';
import { describeUnseenBadge } from '@podverse/helpers';

import { useAccount } from '../contexts/Account';
import { getApiRequestService } from '../factories/apiRequestService';

/**
 * Stop far past any real subscription list, so a server that keeps returning full pages cannot spin
 * this into an unbounded run of requests.
 */
const MAX_PAGES = 5;

const EMPTY_BADGES: ReadonlyMap<string, ChannelUnseenBadge> = new Map();

const readAllPages = async (): Promise<ChannelSeenState[]> => {
  const api = getApiRequestService();
  const states: ChannelSeenState[] = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const response = await api.reqAccountChannelSeenList({ page });
    states.push(...response.data);
    if (response.data.length < response.meta.limit) {
      break;
    }
  }

  return states;
};

/**
 * Unseen counts for the account's followed channels, keyed by channel id.
 *
 * Fetches the account's whole seen state rather than the slice on screen, because the two lists are
 * not ordered the same way — the endpoint answers by channel id, the page renders by whatever the
 * user sorted or filtered by, so page 2 here is not page 2 there. A read page holds enough channels
 * that this is one request for any ordinary subscription list, which is what makes asking for all of
 * it cheaper than trying to ask for exactly the right part of it.
 *
 * Runs on mount, so returning from a channel the user just opened shows the badge already cleared.
 * A failure leaves the list unbadged rather than raising anything: an absent count is a smaller
 * problem than an error banner over a list that is otherwise fine.
 */
export function useChannelUnseenBadges(enabled: boolean): ReadonlyMap<string, ChannelUnseenBadge> {
  const { loggedInAccount } = useAccount();
  const [badges, setBadges] = useState<ReadonlyMap<string, ChannelUnseenBadge>>(EMPTY_BADGES);
  const isActive = enabled && !!loggedInAccount;

  useEffect(() => {
    if (!isActive) {
      setBadges((previous) => (previous.size === 0 ? previous : EMPTY_BADGES));
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const states = await readAllPages();
        if (cancelled) {
          return;
        }

        const next = new Map<string, ChannelUnseenBadge>();
        for (const state of states) {
          const badge = describeUnseenBadge(state);
          if (badge !== null) {
            next.set(state.channel_id_text, badge);
          }
        }
        setBadges(next);
      } catch {
        if (!cancelled) {
          setBadges(EMPTY_BADGES);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isActive]);

  return badges;
}
