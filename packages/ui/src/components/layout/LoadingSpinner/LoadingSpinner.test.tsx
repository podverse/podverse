import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { LoadingSpinner } from './LoadingSpinner';

afterEach(() => {
  cleanup();
});

describe('LoadingSpinner', () => {
  it('defaults to medium size', () => {
    const { container } = render(<LoadingSpinner ariaLabel="Loading" />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('height')).toBe('32');
    expect(svg?.getAttribute('width')).toBe('32');
  });

  it('renders small size', () => {
    const { container } = render(<LoadingSpinner ariaLabel="x" size="small" />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('height')).toBe('18');
  });

  it('renders large size', () => {
    const { container } = render(<LoadingSpinner ariaLabel="x" size="large" />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('height')).toBe('48');
  });

  it('applies ariaLabel for assistive tech when not hidden', () => {
    render(<LoadingSpinner ariaLabel="Please wait" size="medium" />);
    expect(screen.getByLabelText('Please wait')).toBeTruthy();
  });

  it('uses aria-hidden when decorative is true', () => {
    const { container } = render(<LoadingSpinner ariaLabel="ignored" decorative size="medium" />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
  });

  it('uses aria-hidden for inline when no ariaLabel is provided', () => {
    const { container } = render(<LoadingSpinner size="inline" />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
  });

  it('exposes ariaLabel for inline when provided', () => {
    render(<LoadingSpinner ariaLabel="Working" size="inline" />);
    expect(screen.getByLabelText('Working')).toBeTruthy();
  });

  it('merges className onto the spinner', () => {
    const { container } = render(
      <LoadingSpinner ariaLabel="L" className="custom-spinner" size="small" />
    );
    const svg = container.querySelector('svg');
    expect(svg?.classList.contains('custom-spinner')).toBe(true);
  });
});
