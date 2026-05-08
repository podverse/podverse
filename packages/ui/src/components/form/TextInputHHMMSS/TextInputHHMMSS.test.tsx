import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TextInputHHMMSS } from './TextInputHHMMSS';

afterEach(() => {
  cleanup();
});

describe('TextInputHHMMSS', () => {
  it('calls onChange with formatted value when typing', () => {
    const onChange = vi.fn();
    render(
      <TextInputHHMMSS
        aria-label="Start time"
        buttonAriaLabel="Play clip"
        name="clip-start"
        placeholder="00:00:00"
        value=""
        onButtonClick={() => {}}
        onChange={onChange}
      />
    );

    fireEvent.change(screen.getByLabelText('Start time'), { target: { value: '12' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('invokes onButtonClick when play is pressed', () => {
    const onButtonClick = vi.fn();
    render(
      <TextInputHHMMSS
        aria-label="Start time"
        buttonAriaLabel="Play preview"
        name="clip-start"
        placeholder="00:00:00"
        value="00:01:00"
        onButtonClick={onButtonClick}
        onChange={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Play preview' }));
    expect(onButtonClick).toHaveBeenCalledTimes(1);
  });
});
