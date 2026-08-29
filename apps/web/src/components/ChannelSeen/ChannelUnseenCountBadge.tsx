'use client';

import { useTranslations } from 'next-intl';

import type { ChannelUnseenBadge } from '@podverse/helpers';
import { CHANNEL_UNSEEN_COUNT_CAP } from '@podverse/helpers';
import { CountBadge } from '@podverse/ui';

interface ChannelUnseenCountBadgeProps {
  badge: ChannelUnseenBadge | null | undefined;
  /** Placement for the surrounding list, which differs between a row and a grid node. */
  className?: string;
}

/**
 * The unseen-episode count on a subscription row.
 *
 * Both the row and the grid node show it, so the label and cap wiring live here rather than being
 * repeated at each — the two must never disagree about what `20+` means.
 *
 * The badge does not announce itself. A list renders one per row, and a screenful of live regions
 * resolving together would queue dozens of announcements; instead the label becomes part of the
 * row link's accessible name, so the count is read as the channel it belongs to rather than as a
 * loose number.
 */
export function ChannelUnseenCountBadge({ badge, className }: ChannelUnseenCountBadgeProps) {
  const tSubscriptions = useTranslations('subscriptions');

  if (badge === null || badge === undefined) {
    return null;
  }

  return (
    <span className={className}>
      <CountBadge
        announce={false}
        ariaLabel={
          badge.isCapped
            ? tSubscriptions('row.unseen_count_capped_aria', { count: badge.count })
            : tSubscriptions('row.unseen_count_aria', { count: badge.count })
        }
        // The count arrives already capped, with the overflow carried alongside it, while CountBadge
        // decides the `+` by comparing against `max`. Handing it one past the cap is what makes the
        // two agree, and is why a channel with exactly twenty unseen still reads `20`.
        count={badge.isCapped ? CHANNEL_UNSEEN_COUNT_CAP + 1 : badge.count}
        max={CHANNEL_UNSEEN_COUNT_CAP}
      />
    </span>
  );
}
