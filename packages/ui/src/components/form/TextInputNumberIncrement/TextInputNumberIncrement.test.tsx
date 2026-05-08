import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TextInputNumberIncrement } from './TextInputNumberIncrement';

afterEach(() => {
  cleanup();
});

describe('TextInputNumberIncrement', () => {
  it('does not exceed max when incrementing', () => {
    const onChange = vi.fn();
    render(
      <TextInputNumberIncrement
        decrementAriaLabel="Decrement"
        disabled={false}
        incrementAriaLabel="Increment"
        max={10}
        min={0}
        readOnly={false}
        step={1}
        value="10"
        onChange={onChange}
      />
    );

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Increment' }));
    fireEvent.mouseUp(screen.getByRole('button', { name: 'Increment' }));

    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls.at(-1);
    expect(lastCall).toBeDefined();
    const event = lastCall?.[0];
    expect(event?.target.value).toBe('10');
  });

  it('does not go below min when decrementing', () => {
    const onChange = vi.fn();
    render(
      <TextInputNumberIncrement
        decrementAriaLabel="Decrement"
        disabled={false}
        incrementAriaLabel="Increment"
        max={100}
        min={5}
        readOnly={false}
        step={1}
        value="5"
        onChange={onChange}
      />
    );

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Decrement' }));
    fireEvent.mouseUp(screen.getByRole('button', { name: 'Decrement' }));

    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls.at(-1);
    expect(lastCall).toBeDefined();
    const event = lastCall?.[0];
    expect(event?.target.value).toBe('5');
  });
});
