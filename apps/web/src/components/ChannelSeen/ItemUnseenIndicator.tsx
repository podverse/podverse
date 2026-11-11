'use client';

import { useTranslations } from 'next-intl';

import styles from '../../styles/components/ChannelSeen/ItemUnseenIndicator.module.scss';

type ItemUnseenIndicatorProps = {
  className?: string;
  testId?: string;
};

/**
 * Accent presence dot on an item row that was newer than the channel visit's frozen last-seen.
 *
 * Decorative on its own — the parent folds the spoken form into the row's accessible name.
 */
export function ItemUnseenIndicator({ className, testId }: ItemUnseenIndicatorProps) {
  const tSubscriptions = useTranslations('subscriptions');
  const classNames = className === undefined ? styles.dot : `${styles.dot} ${className}`;

  return (
    <span
      aria-hidden
      className={classNames}
      data-testid={testId}
      title={tSubscriptions('row.unseen_indicator_aria')}
    />
  );
}
