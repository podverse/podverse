import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { AppWrapper } from './AppWrapper';

afterEach(() => {
  cleanup();
});

describe('AppWrapper', () => {
  it('renders children', () => {
    render(
      <AppWrapper>
        <span>hello</span>
      </AppWrapper>
    );
    expect(screen.getByText('hello')).toBeTruthy();
  });
});
