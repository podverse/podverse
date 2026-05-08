import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { MainHeader } from './MainHeader';

afterEach(() => {
  cleanup();
});

describe('MainHeader', () => {
  it('renders title', () => {
    render(<MainHeader title="Page title" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Page title' })).toBeTruthy();
  });

  it('renders buttons when provided', () => {
    render(<MainHeader title="T" buttonsNode={<button type="button">Action</button>} />);
    expect(screen.getByRole('button', { name: 'Action' })).toBeTruthy();
  });
});
