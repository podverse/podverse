'use client';

import classNames from 'classnames';
import type { ComponentType, ReactNode } from 'react';
import { FaUserCircle } from 'react-icons/fa';
import {
  FaBars,
  FaChevronDown,
  FaMagnifyingGlass,
  FaRegCircleUser,
  FaXmark,
} from 'react-icons/fa6';

import { DropdownMenu } from '../DropdownMenu/DropdownMenu';
import { DropdownMenuItem } from '../DropdownMenu/DropdownMenuItem';
import type { DropdownMenuLinkComponentProps } from '../DropdownMenu/DropdownMenuLinkItem';
import { DropdownMenuLinkItem } from '../DropdownMenu/DropdownMenuLinkItem';
import { NavArrowButton } from '../NavArrowButton/NavArrowButton';

import styles from './NavBar.module.scss';

/**
 * Structured `@podverse/ui` NavBar. Apps pass localized strings and branding `children`.
 * Contract (i18n, LinkComponent): [`PACKAGES-UI.md`](../../../../PACKAGES-UI.md) (Navigation — NavBar).
 */

export type NavBarAppearance = 'management' | 'web';

export type NavBarLinkComponentProps = {
  'aria-label'?: string;
  children: ReactNode;
  className?: string;
  href: string;
};

export type NavBarBrandVisibility = 'always' | 'mobileOnly';

export type NavBarBrandProps = {
  children: ReactNode;
  href: string;
  /** Merged with the shared brand link styles (e.g. management bold title). */
  linkClassName?: string;
  LinkComponent?: ComponentType<NavBarLinkComponentProps>;
  visibility?: NavBarBrandVisibility;
};

export type NavBarBackForwardProps = {
  backLabel: string;
  forwardLabel: string;
  onBack: () => void;
  onForward: () => void;
};

export type NavBarSearchProps = {
  ariaLabel: string;
  href: string;
  LinkComponent?: ComponentType<NavBarLinkComponentProps>;
};

export type NavBarAccountMenuItem =
  | { key: string; label: string; type: 'meta' }
  | { href: string; key: string; label: string; type: 'link' }
  | { key: string; label: string; onClick: () => void; type: 'action' };

export type NavBarAccountMenuProps = {
  ariaLabel: string;
  displayName?: string;
  isLoggedIn: boolean;
  items: NavBarAccountMenuItem[];
  LinkComponent?: ComponentType<DropdownMenuLinkComponentProps>;
};

export type NavBarMobileToggleProps = {
  closeLabel: string;
  isOpen: boolean;
  onToggle: () => void;
  openLabel: string;
};

export type NavBarProps = {
  appearance?: NavBarAppearance;
  accountMenu?: NavBarAccountMenuProps;
  backForward?: NavBarBackForwardProps;
  brand: NavBarBrandProps;
  mobileToggle?: NavBarMobileToggleProps;
  search?: NavBarSearchProps;
  trailingActions?: ReactNode;
};

function DefaultNavBarLink({ children, className, href }: NavBarLinkComponentProps) {
  return (
    <a className={className} href={href}>
      {children}
    </a>
  );
}

function DefaultSearchLink({
  'aria-label': ariaLabel,
  children,
  className,
  href,
}: NavBarLinkComponentProps) {
  return (
    <a aria-label={ariaLabel} className={className} href={href}>
      {children}
    </a>
  );
}

function NavBarSearchControl({ search }: { search: NavBarSearchProps }) {
  const SearchLink = search.LinkComponent ?? DefaultSearchLink;

  return (
    <SearchLink aria-label={search.ariaLabel} className={styles.searchLink} href={search.href}>
      <FaMagnifyingGlass aria-hidden />
    </SearchLink>
  );
}

export function NavBar({
  appearance = 'management',
  accountMenu,
  backForward,
  brand,
  mobileToggle,
  search,
  trailingActions,
}: NavBarProps) {
  const BrandLink = brand.LinkComponent ?? DefaultNavBarLink;
  const visibility = brand.visibility ?? 'always';
  const brandOuterClassName =
    visibility === 'mobileOnly' ? styles.brandMobileOnly : styles.brandAlways;

  return (
    <nav
      className={appearance === 'web' ? styles.navBarWeb : styles.navBar}
      data-appearance={appearance}
    >
      <div className={classNames(styles.brandRegion, brandOuterClassName)}>
        <BrandLink className={classNames(styles.brandLink, brand.linkClassName)} href={brand.href}>
          {brand.children}
        </BrandLink>
      </div>

      {backForward !== undefined ? (
        <div className={styles.leftCluster}>
          <NavArrowButton
            ariaLabel={backForward.backLabel}
            direction="left"
            onClick={backForward.onBack}
          />
          <NavArrowButton
            ariaLabel={backForward.forwardLabel}
            direction="right"
            onClick={backForward.onForward}
          />
        </div>
      ) : null}

      <div className={styles.rightCluster}>
        {search !== undefined ? <NavBarSearchControl search={search} /> : null}
        {trailingActions}

        {accountMenu !== undefined ? (
          <DropdownMenu
            ariaLabel={accountMenu.ariaLabel}
            className={styles.dropdownWrapper}
            triggerClassName={styles.accountTrigger}
            trigger={
              <>
                {accountMenu.isLoggedIn ? (
                  <div className={styles.profileInfo}>
                    {accountMenu.displayName !== undefined && accountMenu.displayName !== '' ? (
                      <div className={styles.profileName}>{accountMenu.displayName}</div>
                    ) : null}
                    <FaUserCircle aria-hidden className={styles.profileIcon} />
                  </div>
                ) : (
                  <FaRegCircleUser aria-hidden className={styles.profileIcon} />
                )}
                <span className={styles.accountMenuCaret}>
                  <FaChevronDown aria-hidden />
                </span>
              </>
            }
          >
            {accountMenu.items.map((item) => {
              if (item.type === 'meta') {
                return <DropdownMenu.Meta key={item.key}>{item.label}</DropdownMenu.Meta>;
              }
              if (item.type === 'link') {
                return (
                  <DropdownMenuLinkItem
                    key={item.key}
                    LinkComponent={accountMenu.LinkComponent}
                    href={item.href}
                  >
                    {item.label}
                  </DropdownMenuLinkItem>
                );
              }
              return (
                <DropdownMenuItem key={item.key} onClick={item.onClick}>
                  {item.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenu>
        ) : null}

        {mobileToggle !== undefined ? (
          <button
            aria-label={mobileToggle.isOpen ? mobileToggle.closeLabel : mobileToggle.openLabel}
            className={styles.mobileToggleButton}
            type="button"
            onClick={mobileToggle.onToggle}
          >
            <span className={styles.mobileToggleIcon}>
              {mobileToggle.isOpen ? <FaXmark aria-hidden /> : <FaBars aria-hidden />}
            </span>
          </button>
        ) : null}
      </div>
    </nav>
  );
}
