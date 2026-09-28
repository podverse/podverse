import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { Alert } from './Alert';

afterEach(() => {
  cleanup();
});

describe('Alert', () => {
  it('returns null when children is null, undefined, or empty string', () => {
    const { container: c1 } = render(<Alert>{null}</Alert>);
    expect(c1.firstChild).toBeNull();

    const { container: c2 } = render(<Alert>{undefined}</Alert>);
    expect(c2.firstChild).toBeNull();

    const { container: c3 } = render(<Alert>{''}</Alert>);
    expect(c3.firstChild).toBeNull();
  });

  it('renders content when children is non-empty', () => {
    const { getByText } = render(<Alert>Something went wrong</Alert>);
    expect(getByText('Something went wrong')).toBeTruthy();
  });

  it('renders an empty shell when renderWhenEmpty is true', () => {
    const { container } = render(<Alert renderWhenEmpty>{''}</Alert>);
    expect(container.firstElementChild).not.toBeNull();
    expect(container.firstElementChild?.textContent).toBe('');
  });
});
