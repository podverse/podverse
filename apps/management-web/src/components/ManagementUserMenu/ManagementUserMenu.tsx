'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { type KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';
import { FaChevronDown, FaUser } from 'react-icons/fa6';

import { ManagementApiRequestService } from '../../lib/requests/apiRequestService';
import type { CurrentUser } from '../../lib/requests/auth';

import styles from './managementUserMenu.module.scss';

type ManagementUserMenuProps = {
  user: CurrentUser;
};

export function ManagementUserMenu({ user }: ManagementUserMenuProps) {
  const tNav = useTranslations('nav');
  const tAuth = useTranslations('auth');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handlePointerDown = (e: PointerEvent) => {
      if (wrapperRef.current !== null && !wrapperRef.current.contains(e.target as Node)) {
        close();
      }
    };
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, close]);

  const handleLogout = async () => {
    try {
      const service = new ManagementApiRequestService();
      await service.apiRequest({ path: '/auth/logout', method: 'POST' });
    } catch {
      // proceed with redirect even if logout API fails
    }
    close();
    router.replace('/');
  };

  const displayName = (user.email || user.id_text).trim() || '—';

  const onTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen((o) => !o);
    }
  };

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <button
        className={styles.trigger}
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={tNav('userMenu')}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onTriggerKeyDown}
      >
        <FaUser className={styles.userIcon} aria-hidden />
        <span className={styles.userLabel}>{displayName}</span>
        <FaChevronDown className={styles.chevron} aria-hidden />
      </button>
      {open && (
        <div className={styles.panel} role="menu">
          <div className={styles.meta} role="presentation">
            {tNav('userRole', { role: user.role })}
          </div>
          <Link className={styles.menuLink} href="/settings" role="menuitem" onClick={close}>
            {tNav('mySettings')}
          </Link>
          <button className={styles.menuItem} type="button" role="menuitem" onClick={handleLogout}>
            {tAuth('logout')}
          </button>
        </div>
      )}
    </div>
  );
}
