import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { CompactNumericInput } from '../CompactNumericInput/CompactNumericInput';
import { CompactFieldRow, CompactNumericInputRow } from './CompactFieldRow';
import rowStyles from './CompactFieldRow.module.scss';
import textInputStyles from '../TextInput/TextInput.module.scss';

afterEach(() => {
  cleanup();
});

describe('CompactFieldRow', () => {
  it('renders compact fields in a horizontal row', () => {
    render(
      <CompactFieldRow>
        <CompactNumericInput eyebrow="Start time" name="start" onChange={() => {}} value="0" />
        <CompactNumericInput eyebrow="Rows" name="rows" onChange={() => {}} value="5" />
      </CompactFieldRow>
    );

    expect(screen.getByRole('spinbutton', { name: 'Start time' })).toBeTruthy();
    expect(screen.getByRole('spinbutton', { name: 'Rows' })).toBeTruthy();
  });

  it('assigns one-sixth row width to each direct child slot', () => {
    const { container } = render(
      <CompactFieldRow>
        <CompactNumericInput eyebrow="Start time" name="start" onChange={() => {}} value="0" />
      </CompactFieldRow>
    );

    const slot = container.querySelector(`.${rowStyles.row} > *`);
    expect(slot).not.toBeNull();
    expect(container.querySelector(`.${textInputStyles.textInputCompact}`)).not.toBeNull();
  });

  it('exposes CompactNumericInputRow as an alias', () => {
    expect(CompactNumericInputRow).toBe(CompactFieldRow);
  });

  it('renders optional help text below the row', () => {
    render(
      <CompactFieldRow help="Timing and list size.">
        <CompactNumericInput eyebrow="Start time" name="start" onChange={() => {}} value="0" />
      </CompactFieldRow>
    );

    expect(screen.getByText('Timing and list size.')).toBeInTheDocument();
  });
});
