'use client';

import NextLink from 'next/link';
import { useTranslations } from 'next-intl';
import { FaBell } from 'react-icons/fa6';

import type { IconButtonLinkComponentProps } from '@podverse/ui';
import { CountBadge, IconButton } from '@podverse/ui';

import { ROUTES } from '../../constants/routes';
import { useNotifications } from '../../contexts/Notifications';

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
  const { unreadCount } = useNotifications();

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
          ariaLabel={tSettings('notifications.unread_count_aria', { count: unreadCount })}
          count={unreadCount}
          size="corner"
        />
      </span>
    </span>
  );
}
