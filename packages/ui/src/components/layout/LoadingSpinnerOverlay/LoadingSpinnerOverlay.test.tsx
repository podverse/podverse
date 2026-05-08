import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { LoadingSpinnerOverlay } from './LoadingSpinnerOverlay';

afterEach(() => {
  cleanup();
});

describe('LoadingSpinnerOverlay', () => {
  it('returns null when isLoading is false', () => {
    const { container } = render(<LoadingSpinnerOverlay ariaLabel="Loading" isLoading={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders message when provided', () => {
    render(<LoadingSpinnerOverlay ariaLabel="Loading" isLoading message="Please wait" />);
    expect(screen.getByText('Please wait')).toBeTruthy();
  });

  it('passes ariaLabel to the spinner', () => {
    render(<LoadingSpinnerOverlay ariaLabel="Saving" isLoading />);
    expect(screen.getByLabelText('Saving')).toBeTruthy();
  });
});
