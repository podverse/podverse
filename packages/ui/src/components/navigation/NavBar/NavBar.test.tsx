import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { DropdownMenuLinkComponentProps } from '../DropdownMenu/DropdownMenuLinkItem';
import type { NavBarAccountMenuItem, NavBarLinkComponentProps } from './NavBar';
import { NavBar } from './NavBar';

afterEach(() => {
  cleanup();
});

describe('NavBar', () => {
  it('defaults to management appearance', () => {
    render(<NavBar brand={{ children: 'Brand', href: '#' }} />);

    expect(screen.getByRole('navigation').getAttribute('data-appearance')).toBe('management');
  });

  it('sets web appearance when requested', () => {
    render(<NavBar appearance="web" brand={{ children: 'B', href: '#' }} />);

    expect(screen.getByRole('navigation').getAttribute('data-appearance')).toBe('web');
  });

  it('renders brand link with children', () => {
    render(<NavBar brand={{ children: 'Podverse', href: '/home' }} />);

    const link = screen.getByRole('link', { name: 'Podverse' });
    expect(link.getAttribute('href')).toBe('/home');
  });

  it('renders back and forward controls when backForward is set', () => {
    render(
      <NavBar
        backForward={{
          backLabel: 'Go back',
          forwardLabel: 'Go forward',
          onBack: vi.fn(),
          onForward: vi.fn(),
        }}
        brand={{ children: 'X', href: '#' }}
      />
    );

    expect(screen.getByRole('button', { name: 'Go back' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Go forward' })).toBeTruthy();
  });

  it('renders search link when search is set', () => {
    render(
      <NavBar
        brand={{ children: 'X', href: '#' }}
        search={{ ariaLabel: 'Find', href: '/search' }}
      />
    );

    expect(screen.getByRole('link', { name: 'Find' }).getAttribute('href')).toBe('/search');
  });

  it('uses LinkComponent for brand when provided', () => {
    const LinkStub = ({ children, className, href }: NavBarLinkComponentProps) => (
      <a data-testid="brand-stub" className={className} href={href}>
        {children}
      </a>
    );

    render(<NavBar brand={{ LinkComponent: LinkStub, children: 'Logo', href: '/x' }} />);

    expect(screen.getByTestId('brand-stub').getAttribute('href')).toBe('/x');
  });

  it('renders account menu meta, link, and action rows', () => {
    const items: NavBarAccountMenuItem[] = [
      { key: 'm', label: 'Role: admin', type: 'meta' },
      { href: '/settings', key: 's', label: 'Settings', type: 'link' },
      { key: 'x', label: 'Sign out', onClick: vi.fn(), type: 'action' },
    ];

    render(
      <NavBar
        brand={{ children: 'X', href: '#' }}
        accountMenu={{
          ariaLabel: 'Account',
          isLoggedIn: true,
          items,
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Account' }));

    expect(screen.getByRole('menu')).toBeTruthy();
    expect(screen.getByText('Role: admin')).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Settings' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Sign out' })).toBeTruthy();
  });

  it('passes LinkComponent into account link rows', () => {
    const LinkStub = ({ children, className, href, role }: DropdownMenuLinkComponentProps) => (
      <a data-testid="menu-link-stub" className={className} href={href} role={role}>
        {children}
      </a>
    );

    render(
      <NavBar
        brand={{ children: 'X', href: '#' }}
        accountMenu={{
          ariaLabel: 'Account',
          isLoggedIn: false,
          LinkComponent: LinkStub,
          items: [{ href: '/go', key: 'k', label: 'Go', type: 'link' }],
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Account' }));

    expect(screen.getByTestId('menu-link-stub').getAttribute('href')).toBe('/go');
  });

  it('switches mobile toggle aria-label with isOpen', () => {
    const { rerender } = render(
      <NavBar
        brand={{ children: 'X', href: '#' }}
        mobileToggle={{
          closeLabel: 'Close nav',
          isOpen: false,
          onToggle: vi.fn(),
          openLabel: 'Open nav',
        }}
      />
    );

    expect(screen.getByRole('button', { name: 'Open nav' })).toBeTruthy();

    rerender(
      <NavBar
        brand={{ children: 'X', href: '#' }}
        mobileToggle={{
          closeLabel: 'Close nav',
          isOpen: true,
          onToggle: vi.fn(),
          openLabel: 'Open nav',
        }}
      />
    );

    expect(screen.getByRole('button', { name: 'Close nav' })).toBeTruthy();
  });

  it('omits optional clusters when props are omitted', () => {
    render(<NavBar brand={{ children: 'Only', href: '#' }} />);

    expect(screen.queryByRole('button', { name: 'Account' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Find' })).toBeNull();
  });
});
