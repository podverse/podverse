import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FormDropdown } from './FormDropdown';

const OPTIONS = [
  { label: 'English', value: 'en-US' },
  { label: 'Español', value: 'es' },
];

afterEach(() => {
  cleanup();
});

describe('FormDropdown', () => {
  it('renders options and shows the selected label', () => {
    render(
      <FormDropdown id="lang" label="Language" options={OPTIONS} value="es" onChange={() => {}} />
    );

    expect(screen.getByLabelText('Language').textContent).toContain('Español');
    fireEvent.click(screen.getByRole('button', { name: 'Language' }));
    expect(screen.getByRole('menuitem', { name: 'English' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Español' })).toBeTruthy();
  });

  it('calls onChange when another option is chosen', () => {
    const onChange = vi.fn();
    render(
      <FormDropdown
        id="lang"
        options={OPTIONS}
        value="en-US"
        onChange={onChange}
        ariaLabel="Pick"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Pick' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Español' }));

    expect(onChange).toHaveBeenCalledWith('es');
  });

  it('does not call onChange when selecting the current value', () => {
    const onChange = vi.fn();
    render(
      <FormDropdown
        id="lang"
        options={OPTIONS}
        value="en-US"
        onChange={onChange}
        ariaLabel="Pick"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Pick' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'English' }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('renders info text when provided', () => {
    render(
      <FormDropdown
        id="status"
        ariaLabel="Status"
        info="More detail here."
        options={OPTIONS}
        value="en-US"
        onChange={() => {}}
      />
    );

    expect(screen.getByText('More detail here.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Status' }).getAttribute('aria-describedby')).toBe(
      'status-info'
    );
  });

  it('does not open when disabled', () => {
    render(
      <FormDropdown
        id="lang"
        ariaLabel="Pick"
        disabled
        options={OPTIONS}
        value="en-US"
        onChange={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Pick' }));
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
