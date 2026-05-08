import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { LinkRenderProps } from './Link';
import { Link } from './Link';

afterEach(() => {
  cleanup();
});

describe('Link', () => {
  it('renders a button when href is omitted and calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(
      <Link onClick={onClick}>
        <span>Label</span>
      </Link>
    );

    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders the default anchor when href is set and forwards href and merged classes', () => {
    const { container } = render(
      <Link href="/about" className="extra">
        About
      </Link>
    );

    const anchor = container.querySelector('a[href="/about"]');
    expect(anchor).toBeTruthy();
    expect(anchor?.className).toContain('extra');
    expect(anchor?.textContent).toBe('About');
  });

  it('renders a disabled span when href is provided and disabled is true', () => {
    render(
      <Link disabled href="/blocked">
        Blocked
      </Link>
    );

    const span = screen.getByText('Blocked').closest('span');
    expect(span).toBeTruthy();
    expect(span?.getAttribute('aria-disabled')).toBe('true');
  });

  it('uses AnchorComponent when fullPageLoad is true and LinkComponent when false', () => {
    const AnchorStub = ({ children, href }: LinkRenderProps) => (
      <a data-testid="anchor-stub" href={href}>
        {children}
      </a>
    );
    const ClientStub = ({ children, href }: LinkRenderProps) => (
      <a data-testid="client-stub" href={href}>
        {children}
      </a>
    );

    const { rerender } = render(
      <Link AnchorComponent={AnchorStub} LinkComponent={ClientStub} fullPageLoad href="/x">
        Go
      </Link>
    );

    expect(screen.getByTestId('anchor-stub')).toBeTruthy();
    expect(screen.queryByTestId('client-stub')).toBeNull();

    rerender(
      <Link AnchorComponent={AnchorStub} LinkComponent={ClientStub} fullPageLoad={false} href="/x">
        Go
      </Link>
    );

    expect(screen.getByTestId('client-stub')).toBeTruthy();
    expect(screen.queryByTestId('anchor-stub')).toBeNull();
  });

  it('passes LinkRenderProps to a custom LinkComponent', () => {
    const CustomLink = vi.fn((props: LinkRenderProps) => (
      <a data-testid="custom" href={props.href}>
        {props.children}
      </a>
    ));

    render(
      <Link className="wrap" href="/custom" LinkComponent={CustomLink}>
        X
      </Link>
    );

    expect(CustomLink).toHaveBeenCalled();
    expect(CustomLink.mock.calls[0]?.[0]).toMatchObject({
      children: expect.anything(),
      className: expect.stringContaining('wrap'),
      href: '/custom',
    });
  });

  it('applies secondary color class when color is secondary', () => {
    const { container } = render(
      <Link color="secondary" href="/s">
        S
      </Link>
    );

    const anchor = container.querySelector('a');
    expect(anchor?.className).toMatch(/linkSecondary/);
  });

  it('passes target, rel, tabIndex, aria-label, title, and style through to the anchor', () => {
    const { container } = render(
      <Link
        aria-label="Open docs"
        href="https://example.com"
        rel="noopener noreferrer"
        style={{ marginTop: 4 }}
        tabIndex={0}
        target="_blank"
        title="Docs"
      >
        Docs
      </Link>
    );

    const anchor = container.querySelector('a');
    expect(anchor?.getAttribute('target')).toBe('_blank');
    expect(anchor?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(anchor?.getAttribute('tabindex')).toBe('0');
    expect(anchor?.getAttribute('aria-label')).toBe('Open docs');
    expect(anchor?.getAttribute('title')).toBe('Docs');
    expect(anchor?.getAttribute('style')).toContain('margin-top');
  });
});
