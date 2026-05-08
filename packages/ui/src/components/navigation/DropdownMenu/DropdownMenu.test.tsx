import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DropdownMenu } from './DropdownMenu';
import type { DropdownMenuLinkComponentProps } from './DropdownMenuLinkItem';

afterEach(() => {
  cleanup();
});

describe('DropdownMenu', () => {
  it('opens on trigger click and sets aria-expanded', () => {
    render(
      <DropdownMenu ariaLabel="More actions" triggerLabel="More">
        <DropdownMenu.Item onClick={() => {}}>One</DropdownMenu.Item>
      </DropdownMenu>
    );

    const trigger = screen.getByRole('button', { name: 'More actions' });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('menu')).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'One' })).toBeTruthy();
  });

  it('closes on outside pointer down', () => {
    render(
      <div>
        <DropdownMenu ariaLabel="More actions" triggerLabel="More">
          <DropdownMenu.Item>One</DropdownMenu.Item>
        </DropdownMenu>
        <button type="button">Outside</button>
      </div>
    );

    fireEvent.click(screen.getByRole('button', { name: 'More actions' }));
    expect(screen.getByRole('menu')).toBeTruthy();

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Outside' }));
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('closes on Escape and returns focus to trigger', () => {
    render(
      <DropdownMenu ariaLabel="More actions" triggerLabel="More">
        <DropdownMenu.Item>One</DropdownMenu.Item>
      </DropdownMenu>
    );

    const trigger = screen.getByRole('button', { name: 'More actions' });
    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('invokes item onClick and closes the panel', () => {
    const onItem = vi.fn();
    render(
      <DropdownMenu ariaLabel="More actions" triggerLabel="More">
        <DropdownMenu.Item onClick={onItem}>Delete all</DropdownMenu.Item>
      </DropdownMenu>
    );

    fireEvent.click(screen.getByRole('button', { name: 'More actions' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete all' }));
    expect(onItem).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('renders meta above menu items', () => {
    render(
      <DropdownMenu ariaLabel="Account" triggerLabel="Me">
        <DropdownMenu.Meta>Role: admin</DropdownMenu.Meta>
        <DropdownMenu.Item onClick={() => {}}>Settings</DropdownMenu.Item>
      </DropdownMenu>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Account' }));
    expect(screen.getByText('Role: admin')).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Settings' })).toBeTruthy();
  });

  it('closes when a link item is activated', () => {
    function MenuLinkStub(props: DropdownMenuLinkComponentProps) {
      return (
        <button type="button" className={props.className} role={props.role} onClick={props.onClick}>
          {props.children}
        </button>
      );
    }

    render(
      <DropdownMenu ariaLabel="Nav" triggerLabel="Go">
        <DropdownMenu.LinkItem LinkComponent={MenuLinkStub} href="/settings">
          Settings page
        </DropdownMenu.LinkItem>
      </DropdownMenu>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Nav' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Settings page' }));
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('moves selection with ArrowDown when menu is open', () => {
    render(
      <DropdownMenu ariaLabel="Pick" triggerLabel="Open">
        <DropdownMenu.Item onClick={() => {}}>First</DropdownMenu.Item>
        <DropdownMenu.Item onClick={() => {}}>Second</DropdownMenu.Item>
      </DropdownMenu>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Pick' }));
    const menu = screen.getByRole('menu');
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(screen.getByRole('menuitem', { name: 'Second' }).getAttribute('aria-selected')).toBe(
      'true'
    );
  });
});
