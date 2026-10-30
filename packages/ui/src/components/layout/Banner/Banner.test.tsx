import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { Banner } from './Banner';

import styles from './Banner.module.scss';

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

  it('uses the danger style when no variant is given', () => {
    render(<Banner message="Danger copy" role="alert" />);

    const banner = screen.getByRole('alert');
    expect(banner.className).toContain(styles.danger);
    expect(banner.className).not.toContain(styles.warning);
  });

  it('uses the warning style for the warning variant', () => {
    render(<Banner message="Warning copy" role="status" variant="warning" />);

    const banner = screen.getByRole('status');
    expect(banner.className).toContain(styles.warning);
    expect(banner.className).not.toContain(styles.danger);
  });
});
