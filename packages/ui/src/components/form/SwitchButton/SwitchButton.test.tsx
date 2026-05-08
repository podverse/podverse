import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SwitchButton } from './SwitchButton';

afterEach(() => {
  cleanup();
});

describe('SwitchButton', () => {
  it('toggles on click and shows on label when checked', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <SwitchButton
        id="s1"
        label="Feature"
        checked={false}
        onChange={onChange}
        stateOffLabel="Off"
        stateOnLabel="On"
      />
    );

    expect(screen.getByText('Off')).toBeTruthy();
    fireEvent.click(screen.getByRole('switch', { name: 'Feature' }));
    expect(onChange).toHaveBeenCalledWith(true);

    rerender(
      <SwitchButton
        id="s1"
        label="Feature"
        checked
        onChange={onChange}
        stateOffLabel="Off"
        stateOnLabel="On"
      />
    );
    expect(screen.getByText('On')).toBeTruthy();
  });
});
