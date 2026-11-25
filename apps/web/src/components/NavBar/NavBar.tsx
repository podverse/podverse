'use client';

import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import type { NavBarAccountMenuItem } from '@podverse/ui';
import { NavBar as NavBarUi, useAppBarTitle } from '@podverse/ui';

import { ROUTES } from '../../constants/routes';
import { useAccount } from '../../contexts/Account';
import { useLocalSettings } from '../../contexts/LocalSettings';
import { useModals } from '../../contexts/Modals';
import { signOutThisBrowser } from '../../lib/auth/signOutThisBrowser';
import { NavBarBrand } from './NavBarBrand';
import { NotificationBellButton } from './NotificationBellButton';

export const NavBar = () => {
  const pathname = usePathname();
  const appBarTitle = useAppBarTitle();
  const { loggedInAccount } = useAccount();
  const { mobileSidebarOpen, setMobileSidebarOpen } = useLocalSettings();
  const { setModalAuthLogin } = useModals();
  const tMisc = useTranslations('misc');
  const tFeatures = useTranslations('features');
  const tMembership = useTranslations('membership');
  const tSettings = useTranslations('settings');
  const tAuthentication = useTranslations('authentication');

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname, setMobileSidebarOpen]);

  async function handleLogout() {
    await signOutThisBrowser(loggedInAccount?.id_text);
  }

  const displayName =
    loggedInAccount?.account_profile?.display_name ||
    loggedInAccount?.account_credentials?.email ||
    '';

  const accountItems: NavBarAccountMenuItem[] = [
    {
      href: ROUTES.MY_PROFILE,
      key: 'profile',
      label: tFeatures('my_profile'),
      type: 'link',
    },
    {
      href: ROUTES.MEMBERSHIP,
      key: 'membership',
      label: tMembership('premium'),
      type: 'link',
    },
    {
      href: ROUTES.SETTINGS,
      key: 'settings',
      label: tSettings('settings'),
      type: 'link',
    },
    {
      key: 'auth',
      label: loggedInAccount ? tAuthentication('logout') : tAuthentication('login'),
      onClick: () => {
        if (loggedInAccount) {
          void handleLogout();
        } else {
          setModalAuthLogin({ isOpen: true });
        }
      },
      type: 'action',
    },
  ];

  const handleMobileToggle = () => {
    setMobileSidebarOpen((open) => !open);
  };

  return (
    <NavBarUi
      appearance="web"
      accountMenu={{
        ariaLabel: tSettings('account.account'),
        displayName,
        isLoggedIn: loggedInAccount !== null && loggedInAccount !== undefined,
        items: accountItems,
        LinkComponent: NextLink,
      }}
      brand={{
        children: <NavBarBrand />,
        href: loggedInAccount ? ROUTES.HOME : ROUTES.BROWSE,
        LinkComponent: NextLink,
        visibility: 'mobileOnly',
      }}
      mobileToggle={{
        closeLabel: tMisc('navbar_menu_close'),
        isOpen: mobileSidebarOpen,
        onToggle: handleMobileToggle,
        openLabel: tMisc('navbar_menu_open'),
      }}
      search={{
        ariaLabel: tFeatures('search.search'),
        href: ROUTES.SEARCH,
        LinkComponent: NextLink,
      }}
      title={appBarTitle ?? undefined}
      trailingActions={
        loggedInAccount !== null && loggedInAccount !== undefined ? (
          <NotificationBellButton />
        ) : null
      }
    />
  );
};
