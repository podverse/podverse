import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { FormInset } from './FormInset';

afterEach(() => {
  cleanup();
});

describe('FormInset', () => {
  it('renders children', () => {
    render(<FormInset data-testid="form-inset">Controls</FormInset>);
    expect(screen.getByTestId('form-inset')).toHaveTextContent('Controls');
  });

  it('renders a heading above the inset panel when heading is provided', () => {
    render(
      <FormInset
        data-testid="form-inset-section"
        heading="Options"
        headingId="options-heading"
      >
        Controls
      </FormInset>
    );

    expect(screen.getByRole('region', { name: 'Options' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: 'Options' })).toHaveAttribute(
      'id',
      'options-heading'
    );
    expect(screen.getByTestId('form-inset-section')).toHaveTextContent('Controls');
  });

  it('renders headingAccessory beside the heading', () => {
    render(
      <FormInset
        heading="Embed code"
        headingAccessory={<button type="button">Help</button>}
      >
        Controls
      </FormInset>
    );

    expect(screen.getByRole('button', { name: 'Help' })).toBeTruthy();
  });
});
