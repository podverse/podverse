import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CheckboxField } from './CheckboxField';

afterEach(() => {
  cleanup();
});

describe('CheckboxField', () => {
  it('calls onChange with toggled value when clicked', () => {
    const onChange = vi.fn();
    render(<CheckboxField label="Accept terms" checked={false} onChange={onChange} />);

    const input = screen.getByRole('checkbox', { name: 'Accept terms' });
    fireEvent.click(input);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('uses explicit id and name on the input', () => {
    render(
      <CheckboxField
        id="my-checkbox"
        name="optIn"
        label="Opt in"
        checked={false}
        onChange={vi.fn()}
      />
    );

    const input = screen.getByRole('checkbox') as HTMLInputElement;
    expect(input.id).toBe('my-checkbox');
    expect(input.name).toBe('optIn');
  });

  it('merges className onto the label when wrapInDiv is false', () => {
    const { container } = render(
      <CheckboxField className="extra-label" label="L" checked={false} onChange={vi.fn()} />
    );

    const label = container.querySelector('label.extra-label');
    expect(label).not.toBeNull();
  });

  it('wraps in a div with LabeledCheckbox-style layout when wrapInDiv is true', () => {
    const { container } = render(
      <CheckboxField
        wrapInDiv
        className="block-wrap"
        id="w1"
        name="w1"
        label="Wrapped"
        checked={false}
        onChange={vi.fn()}
      />
    );

    const outer = container.firstElementChild;
    expect(outer?.tagName).toBe('DIV');
    expect(outer?.className).toContain('block-wrap');

    const input = screen.getByRole('checkbox', { name: 'Wrapped' }) as HTMLInputElement;
    expect(input.id).toBe('w1');
    expect(input.name).toBe('w1');
  });
});
