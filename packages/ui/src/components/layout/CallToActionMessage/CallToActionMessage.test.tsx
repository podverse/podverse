import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CallToActionMessage } from './CallToActionMessage';

afterEach(() => {
  cleanup();
});

describe('CallToActionMessage', () => {
  it('renders message and invokes the button handler', () => {
    const onClick = vi.fn();
    render(<CallToActionMessage message="Hello" buttonLabel="Go" onButtonClick={onClick} />);

    expect(screen.getByText('Hello')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('applies modal layout classes when layout is modal', () => {
    const onClick = vi.fn();
    const { container } = render(
      <CallToActionMessage layout="modal" message="Hi" buttonLabel="Go" onButtonClick={onClick} />
    );

    const root = container.firstChild as HTMLElement;
    expect(root.className).toMatch(/rootModal/);
  });
});
