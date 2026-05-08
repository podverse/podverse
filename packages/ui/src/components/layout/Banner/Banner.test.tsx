import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { Banner } from './Banner';

afterEach(() => {
  cleanup();
});

describe('Banner', () => {
  it('renders message and optional action', () => {
    render(<Banner message="Status copy" action={<a href="/renew">Renew</a>} role="status" />);

    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.getByText('Status copy')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Renew' })).toBeTruthy();
  });

  it('renders without action', () => {
    render(<Banner message="Only message" />);

    expect(screen.getByText('Only message')).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
  });
});
