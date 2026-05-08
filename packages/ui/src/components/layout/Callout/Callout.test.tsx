import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { Callout } from './Callout';

afterEach(() => {
  cleanup();
});

describe('Callout', () => {
  it('renders children', () => {
    render(<Callout>Inside</Callout>);
    expect(screen.getByText('Inside')).toBeTruthy();
  });
});
