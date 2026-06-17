import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { CompactNumericInput } from './CompactNumericInput';

import textInputStyles from '../TextInput/TextInput.module.scss';

afterEach(() => {
  cleanup();
});

describe('CompactNumericInput', () => {
  it('renders a compact numeric text input', () => {
    const { container } = render(
      <CompactNumericInput
        eyebrow="Start time (seconds)"
        name="start_time"
        onChange={() => {}}
        value="0"
      />
    );

    expect(screen.getByRole('spinbutton')).toBeTruthy();
    expect(container.querySelector(`.${textInputStyles.textInputCompact}`)).not.toBeNull();
  });
});
