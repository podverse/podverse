import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Modal } from './Modal';

afterEach(() => {
  cleanup();
});

describe('Modal', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <Modal ariaLabel="Empty" closeButtonAriaLabel="Close" isOpen={false} onClose={() => {}}>
        <p>Inside</p>
      </Modal>
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders an accessible dialog with a backdrop when open', () => {
    const onClose = vi.fn();

    render(
      <Modal ariaLabel="Test dialog" closeButtonAriaLabel="Close dialog" isOpen onClose={onClose}>
        <p>Modal body</p>
      </Modal>
    );

    const dialog = screen.getByRole('dialog', { name: 'Test dialog' });
    expect(dialog).toBeTruthy();
    expect(dialog.querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(screen.getByText('Modal body')).toBeTruthy();
  });
});
