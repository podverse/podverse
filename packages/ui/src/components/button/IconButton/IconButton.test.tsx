import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { IconButtonLinkComponentProps } from './IconButton';
import { IconButton } from './IconButton';

afterEach(() => {
  cleanup();
});

describe('IconButton', () => {
  it('renders a button with aria-label when href is omitted', () => {
    render(
      <IconButton aria-label="Save" onClick={() => {}}>
        <span data-testid="icon">i</span>
      </IconButton>
    );

    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
    expect(screen.getByTestId('icon')).toBeTruthy();
  });

  it('renders LinkComponent when only onClick is provided (app Link pattern)', () => {
    const LinkStub = ({
      onClick,
      children,
      'aria-label': ariaLabel,
      type,
    }: IconButtonLinkComponentProps) => (
      <button data-testid="stub-link-button" type={type} aria-label={ariaLabel} onClick={onClick}>
        {children}
      </button>
    );

    const onClick = vi.fn();
    render(
      <IconButton aria-label="Act" LinkComponent={LinkStub} onClick={onClick}>
        <span>x</span>
      </IconButton>
    );

    fireEvent.click(screen.getByTestId('stub-link-button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders LinkComponent when href is provided', () => {
    const LinkStub = ({
      href,
      children,
      'aria-label': ariaLabel,
    }: IconButtonLinkComponentProps) => (
      <a data-testid="stub-link" href={href ?? ''} aria-label={ariaLabel}>
        {children}
      </a>
    );

    render(
      <IconButton aria-label="Open" href="/x" LinkComponent={LinkStub}>
        <span>x</span>
      </IconButton>
    );

    const link = screen.getByTestId('stub-link');
    expect(link.getAttribute('href')).toBe('/x');
    expect(link.getAttribute('aria-label')).toBe('Open');
  });

  it('fires onClick in button mode', () => {
    const onClick = vi.fn();
    render(
      <IconButton aria-label="Tap" onClick={onClick}>
        <span>o</span>
      </IconButton>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Tap' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not fire onClick when disabled', () => {
    const onClick = vi.fn();
    render(
      <IconButton aria-label="Tap disabled" disabled onClick={onClick}>
        <span>o</span>
      </IconButton>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Tap disabled' }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('shows spinner and blocks onClick when isLoading', () => {
    const onClick = vi.fn();
    render(
      <IconButton aria-label="Busy" isLoading onClick={onClick}>
        <span data-testid="icon">o</span>
      </IconButton>
    );

    const btn = screen.getByRole('button', { name: 'Busy' });
    expect(btn.querySelector('svg')).not.toBeNull();
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });
});
