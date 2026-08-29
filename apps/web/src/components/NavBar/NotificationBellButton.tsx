'use client';

import NextLink from 'next/link';
import { useTranslations } from 'next-intl';
import { FaBell } from 'react-icons/fa6';

import type { IconButtonLinkComponentProps } from '@podverse/ui';
import { CountBadge, IconButton } from '@podverse/ui';

import { ROUTES } from '../../constants/routes';
import { useNotificationsUnseenCount } from '../../hooks/useNotificationsUnseenCount';

import styles from './NotificationBellButton.module.scss';

function NotificationBellLink({
  'aria-label': ariaLabel,
  href,
  children,
  className,
  title,
}: IconButtonLinkComponentProps) {
  return (
    <NextLink
      aria-label={ariaLabel}
      className={className}
      href={href ?? ROUTES.NOTIFICATIONS}
      title={title}
    >
      {children}
    </NextLink>
  );
}

export function NotificationBellButton() {
  const tSettings = useTranslations('settings');
  const unseenCount = useNotificationsUnseenCount({ enabled: true });

  return (
    <span className={styles.bellLinkWrap}>
      <IconButton
        aria-label={tSettings('notifications.notifications')}
        title={tSettings('notifications.notifications')}
        appearance="ghost"
        href={ROUTES.NOTIFICATIONS}
        LinkComponent={NotificationBellLink}
      >
        <FaBell aria-hidden className={styles.bellIcon} />
      </IconButton>
      <span className={styles.badgeWrap}>
        <CountBadge
          ariaLabel={tSettings('notifications.unseen_count_aria', { count: unseenCount })}
          count={unseenCount}
        />
      </span>
    </span>
  );
}
