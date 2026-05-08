import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { PopoverIcon } from './PopoverIcon';

afterEach(() => {
  cleanup();
});

describe('PopoverIcon', () => {
  it('renders trigger with aria-label', () => {
    render(<PopoverIcon ariaLabel="Help for field" body="Details here" />);

    expect(screen.getByRole('button', { name: 'Help for field' })).toBeTruthy();
  });
});
