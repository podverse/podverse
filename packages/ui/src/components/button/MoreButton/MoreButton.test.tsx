import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MoreButton } from './MoreButton';

afterEach(() => {
  cleanup();
});

describe('MoreButton', () => {
  it('renders trigger with aria-label when closed', () => {
    render(
      <MoreButton
        ariaLabel="More options"
        moreButtonMenuItems={[{ label: 'One', onClick: () => {} }]}
      />
    );

    expect(screen.getByRole('button', { name: 'More options' })).toBeTruthy();
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('opens menu on click and shows items', () => {
    const onOne = vi.fn();
    render(
      <MoreButton
        ariaLabel="Actions"
        moreButtonMenuItems={[
          { label: 'First', onClick: onOne },
          { label: 'Second', onClick: () => {} },
        ]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Actions' }));

    expect(screen.getByRole('menu')).toBeTruthy();
    expect(screen.getByText('First')).toBeTruthy();
    expect(screen.getByText('Second')).toBeTruthy();
  });
});
